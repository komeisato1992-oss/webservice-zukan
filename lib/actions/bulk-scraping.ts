"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isScrapingSupported } from "@/lib/scraping/catalog";
import type { BulkScrapingItem } from "@/lib/types/database";

export type BulkUpdateTarget = {
  id: string;
  name: string;
  slug: string;
  officialUrl: string | null;
  displayOrder: number;
  supported: boolean;
};

export async function listBulkUpdateTargetsAction(): Promise<{
  ok: boolean;
  message: string;
  targets: BulkUpdateTarget[];
}> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "管理者権限が必要です。", targets: [] };
  }

  const { data, error } = await supabase
    .from("services")
    .select("id, name, slug, official_url, display_order")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return { ok: false, message: error.message, targets: [] };
  }

  const targets = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    officialUrl: row.official_url,
    displayOrder: row.display_order,
    // Provider カタログ（Registry）基準。社名の if 分岐はしない
    supported: isScrapingSupported(row.slug),
  }));

  return { ok: true, message: "ok", targets };
}

export async function listBulkScrapingJobsAction(limit = 10): Promise<{
  ok: boolean;
  message: string;
  jobs: {
    id: string;
    startedAt: string;
    completedAt: string | null;
    successCount: number;
    failedCount: number;
    unsupportedCount: number;
  }[];
}> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "管理者権限が必要です。", jobs: [] };
  }

  const { data, error } = await supabase
    .from("bulk_scraping_jobs")
    .select(
      "id, started_at, completed_at, success_count, failed_count, unsupported_count",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // マイグレーション未適用時も画面は使えるようにする
    return {
      ok: true,
      message: error.message,
      jobs: [],
    };
  }

  return {
    ok: true,
    message: "ok",
    jobs: (data ?? []).map((job) => ({
      id: job.id,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      successCount: job.success_count,
      failedCount: job.failed_count,
      unsupportedCount: job.unsupported_count,
    })),
  };
}

export async function saveBulkScrapingJobAction(input: {
  startedAt: string;
  completedAt: string;
  items: BulkScrapingItem[];
}): Promise<{ ok: boolean; message: string; jobId?: string }> {
  const { supabase, admin, user } = await requireAdmin();
  if (!admin || !user) {
    return { ok: false, message: "管理者権限が必要です。" };
  }

  const successCount = input.items.filter((i) => i.status === "success").length;
  const failedCount = input.items.filter((i) => i.status === "failed").length;
  const unsupportedCount = input.items.filter(
    (i) => i.status === "unsupported",
  ).length;

  const { data, error } = await supabase
    .from("bulk_scraping_jobs")
    .insert({
      started_at: input.startedAt,
      completed_at: input.completedAt,
      success_count: successCount,
      failed_count: failedCount,
      unsupported_count: unsupportedCount,
      items: input.items,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      message: `更新履歴の保存に失敗しました: ${error.message}`,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin", "layout");

  return { ok: true, message: "更新履歴を保存しました。", jobId: data.id };
}

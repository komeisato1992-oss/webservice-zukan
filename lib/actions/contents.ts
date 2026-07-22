"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublicSiteCache } from "@/lib/site/cache";
import type {
  ManagedContentStatus,
  ManagedContentType,
} from "@/lib/types/database";
import {
  createArticleGenerator,
  extractHighlightsFromScrape,
} from "@/lib/contents/article-generator";

function revalidateContents() {
  revalidatePath("/admin/contents");
  revalidatePublicSiteCache();
}

export type ContentActionResult = {
  ok: boolean;
  message: string;
  id?: string;
};

const CONTENT_TYPES: ManagedContentType[] = [
  "ai_article",
  "notice",
  "campaign",
  "feature",
];

const STATUSES: ManagedContentStatus[] = [
  "draft",
  "review",
  "approved",
  "published",
  "expired",
  "rejected",
];

function parseType(v: FormDataEntryValue | null): ManagedContentType | null {
  const s = String(v ?? "");
  return CONTENT_TYPES.includes(s as ManagedContentType)
    ? (s as ManagedContentType)
    : null;
}

function parseStatus(
  v: FormDataEntryValue | null,
): ManagedContentStatus | null {
  const s = String(v ?? "");
  return STATUSES.includes(s as ManagedContentStatus)
    ? (s as ManagedContentStatus)
    : null;
}

export async function saveManagedContentAction(
  formData: FormData,
): Promise<ContentActionResult> {
  const { supabase, admin, user } = await requireAdmin();
  if (!admin || !user) {
    return { ok: false, message: "管理者権限が必要です。" };
  }

  const id = String(formData.get("id") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim() || null;
  const contentType = parseType(formData.get("content_type"));
  const serviceId = String(formData.get("service_id") ?? "").trim() || null;
  const sourceUrl = String(formData.get("source_url") ?? "").trim() || null;
  const isChecked = formData.get("is_checked") === "on" || formData.get("is_checked") === "true";
  const publishChecked =
    formData.get("is_published") === "on" ||
    formData.get("is_published") === "true";
  const statusRaw = parseStatus(formData.get("status"));
  const priorityRaw = String(formData.get("priority") ?? "").trim();
  const priority = priorityRaw === "" ? null : Number(priorityRaw);
  const publishedAt =
    String(formData.get("published_at") ?? "").trim() || null;
  const expiresAt = String(formData.get("expires_at") ?? "").trim() || null;

  if (!title) return { ok: false, message: "タイトルを入力してください。" };
  if (!contentType) {
    return { ok: false, message: "コンテンツ種類を選択してください。" };
  }
  if (priorityRaw !== "" && (Number.isNaN(priority) || (priority ?? 0) < 1)) {
    return { ok: false, message: "優先順位は1以上の整数で入力してください。" };
  }

  let status: ManagedContentStatus = statusRaw ?? "draft";
  if (publishChecked) {
    if (!isChecked) {
      return {
        ok: false,
        message: "公開するには確認済みにしてください。",
      };
    }
    if (priority == null) {
      return {
        ok: false,
        message: "公開するには優先順位を入力してください。",
      };
    }
    status = "published";
  } else if (status === "published") {
    status = isChecked ? "approved" : "review";
  }

  const payload = {
    content_type: contentType,
    title,
    summary,
    body,
    service_id: serviceId,
    source_url: sourceUrl,
    status,
    is_checked: isChecked,
    priority,
    published_at: publishedAt
      ? new Date(publishedAt).toISOString()
      : publishChecked
        ? new Date().toISOString()
        : null,
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    updated_by: user.id,
  };

  if (id) {
    const { error } = await supabase
      .from("managed_contents")
      .update(payload)
      .eq("id", id)
      .is("deleted_at", null);
    if (error) return { ok: false, message: error.message };
    revalidateContents();
    return { ok: true, message: "保存しました。", id };
  }

  const { data, error } = await supabase
    .from("managed_contents")
    .insert({
      ...payload,
      created_by: user.id,
      ai_generated: false,
      source_type: "manual_admin",
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };
  revalidateContents();
  return { ok: true, message: "作成しました。", id: data.id };
}

export async function deleteManagedContentAction(
  formData: FormData,
): Promise<ContentActionResult> {
  const { supabase, admin, user } = await requireAdmin();
  if (!admin || !user) {
    return { ok: false, message: "管理者権限が必要です。" };
  }
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "IDが不正です。" };

  const { error } = await supabase
    .from("managed_contents")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: user.id,
      status: "rejected",
    })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { ok: false, message: error.message };
  revalidateContents();
  return { ok: true, message: "削除しました。" };
}

/** スクレイピング成功後に記事候補を review で作成（自動公開しない） */
export async function insertArticleCandidateFromScrape(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  input: {
    serviceId: string;
    serviceName: string;
    scrapingRunId: string;
    resultJson: unknown;
    sourceUrls?: string[];
    warnings?: string[];
    userId: string;
  },
): Promise<ContentActionResult> {
  const extracted = extractHighlightsFromScrape(input.resultJson);
  const sourceUrl = extracted.sourceUrl ?? input.sourceUrls?.[0] ?? null;

  const generator = createArticleGenerator();
  const generated = await generator.generate({
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    scrapingRunId: input.scrapingRunId,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    highlights: extracted.highlights,
    campaignEndDate: extracted.campaignEndDate,
    warnings: input.warnings,
  });

  const { data, error } = await supabase
    .from("managed_contents")
    .insert({
      content_type: "ai_article",
      title: generated.title,
      summary: generated.summary,
      body: generated.body,
      service_id: input.serviceId,
      source_url: sourceUrl,
      source_type: "scraping",
      status: "review",
      is_checked: false,
      priority: null,
      published_at: null,
      expires_at: generated.expiresAt,
      scraping_run_id: input.scrapingRunId,
      ai_generated: true,
      created_by: input.userId,
      updated_by: input.userId,
    })
    .select("id")
    .single();

  if (error) {
    console.warn("[contents] candidate insert failed:", error.message);
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/contents");
  return {
    ok: true,
    message: "記事候補をコンテンツ管理に保存しました。",
    id: data.id,
  };
}

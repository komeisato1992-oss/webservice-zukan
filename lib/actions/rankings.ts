"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  discardRankingDraft,
  ensureRankingDraft,
  publishRankingDraft,
  saveRankingDraft,
  type RankingDraftPayload,
} from "@/lib/cms/rankings";

export async function saveRankingDraftAction(
  payload: RankingDraftPayload,
): Promise<{ ok: boolean; message: string; changeCount?: number }> {
  const { supabase, admin, user } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };

  const result = await saveRankingDraft(
    supabase as never,
    payload,
    user?.id ?? null,
  );
  if (!result.ok) return result;
  revalidatePath("/admin/rankings");
  return {
    ok: true,
    message: `下書きを保存しました（変更 ${result.changeCount}）。`,
    changeCount: result.changeCount,
  };
}

export async function publishRankingDraftAction(): Promise<{
  ok: boolean;
  message: string;
}> {
  const { supabase, admin, user } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };

  const result = await publishRankingDraft(
    supabase as never,
    user?.id ?? null,
  );
  if (!result.ok) return result;
  revalidatePath("/admin/rankings");
  revalidatePath("/admin/history");
  revalidatePath("/");
  return {
    ok: true,
    message: `公開へ反映しました（${result.changeCount} 件）。`,
  };
}

export async function discardRankingDraftAction(): Promise<{
  ok: boolean;
  message: string;
}> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };

  const result = await discardRankingDraft(supabase as never);
  if (!result.ok) return result;
  revalidatePath("/admin/rankings");
  return { ok: true, message: "変更を破棄し、公開内容に戻しました。" };
}

export async function getRankingDraftAction() {
  const { supabase, admin } = await requireAdmin();
  if (!admin) return null;
  return ensureRankingDraft(supabase as never);
}

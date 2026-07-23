"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  discardRankingDraft,
  ensureRankingDraft,
  publishRankingDraft,
  purposesForDictionarySlug,
  saveRankingDraft,
  type RankingDraftPayload,
} from "@/lib/cms/rankings";

async function resolveDictionaryContext(dictionaryId: string) {
  const { supabase, admin, user } = await requireAdmin();
  if (!admin) {
    return {
      ok: false as const,
      message: "管理者権限が必要です。",
      supabase,
      user,
      dictionarySlug: null as string | null,
    };
  }
  if (!dictionaryId) {
    return {
      ok: false as const,
      message: "dictionary_id が必要です。",
      supabase,
      user,
      dictionarySlug: null as string | null,
    };
  }
  const { data: dictionary, error } = await supabase
    .from("dictionaries")
    .select("id, slug")
    .eq("id", dictionaryId)
    .maybeSingle();
  if (error || !dictionary) {
    return {
      ok: false as const,
      message: error?.message ?? "図鑑が見つかりません。",
      supabase,
      user,
      dictionarySlug: null as string | null,
    };
  }
  return {
    ok: true as const,
    message: "",
    supabase,
    user,
    dictionarySlug: dictionary.slug as string,
  };
}

export async function saveRankingDraftAction(
  dictionaryId: string,
  payload: RankingDraftPayload,
): Promise<{ ok: boolean; message: string; changeCount?: number }> {
  const ctx = await resolveDictionaryContext(dictionaryId);
  if (!ctx.ok || !ctx.dictionarySlug) {
    return { ok: false, message: ctx.message };
  }

  const purposes = purposesForDictionarySlug(ctx.dictionarySlug);
  const result = await saveRankingDraft(
    ctx.supabase as never,
    dictionaryId,
    payload,
    ctx.user?.id ?? null,
    purposes,
  );
  if (!result.ok) return result;
  revalidatePath(`/admin/${ctx.dictionarySlug}/rankings`);
  revalidatePath("/admin", "layout");
  return {
    ok: true,
    message: `下書きを保存しました（変更 ${result.changeCount}）。`,
    changeCount: result.changeCount,
  };
}

export async function publishRankingDraftAction(
  dictionaryId: string,
): Promise<{
  ok: boolean;
  message: string;
}> {
  const ctx = await resolveDictionaryContext(dictionaryId);
  if (!ctx.ok || !ctx.dictionarySlug) {
    return { ok: false, message: ctx.message };
  }

  const purposes = purposesForDictionarySlug(ctx.dictionarySlug);
  const result = await publishRankingDraft(
    ctx.supabase as never,
    dictionaryId,
    ctx.user?.id ?? null,
    purposes,
  );
  if (!result.ok) return result;
  revalidatePath(`/admin/${ctx.dictionarySlug}/rankings`);
  revalidatePath(`/${ctx.dictionarySlug}`);
  revalidatePath("/admin", "layout");
  return {
    ok: true,
    message: `公開へ反映しました（${result.changeCount} 件）。`,
  };
}

export async function discardRankingDraftAction(
  dictionaryId: string,
): Promise<{
  ok: boolean;
  message: string;
}> {
  const ctx = await resolveDictionaryContext(dictionaryId);
  if (!ctx.ok || !ctx.dictionarySlug) {
    return { ok: false, message: ctx.message };
  }

  const purposes = purposesForDictionarySlug(ctx.dictionarySlug);
  const result = await discardRankingDraft(
    ctx.supabase as never,
    dictionaryId,
    purposes,
  );
  if (!result.ok) return result;
  revalidatePath(`/admin/${ctx.dictionarySlug}/rankings`);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "変更を破棄し、公開内容に戻しました。" };
}

export async function getRankingDraftAction(dictionaryId: string) {
  const ctx = await resolveDictionaryContext(dictionaryId);
  if (!ctx.ok || !ctx.dictionarySlug) return null;
  return ensureRankingDraft(
    ctx.supabase as never,
    dictionaryId,
    purposesForDictionarySlug(ctx.dictionarySlug),
  );
}

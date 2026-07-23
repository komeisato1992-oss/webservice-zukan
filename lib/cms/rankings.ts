import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ALL_RANKING_PURPOSE_OPTIONS,
  DOMAIN_RANKING_PURPOSE_OPTIONS,
  RANKING_PURPOSE_OPTIONS,
  type PurposeOption,
} from "@/lib/site/content";
import { revalidateRankingCache } from "@/lib/site/cache";

// 新テーブルはマイグレーション適用前後で型が揃わないため緩いクライアントを使う
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;
type Json = unknown;

export type RankingEntryDraft = {
  purpose_id: string;
  rank: 1 | 2 | 3;
  service_id: string | null;
  plan_id: string | null;
  /** ★評価 0〜5（小数可）。未設定は null */
  rating: number | null;
  card_comment: string;
  sub_comment: string;
  is_visible: boolean;
};

export type RankingDraftPayload = {
  entries: RankingEntryDraft[];
};

export function purposesForDictionarySlug(
  dictionarySlug: string,
): PurposeOption[] {
  if (dictionarySlug === "domain") return DOMAIN_RANKING_PURPOSE_OPTIONS;
  if (dictionarySlug === "server") return RANKING_PURPOSE_OPTIONS;
  return ALL_RANKING_PURPOSE_OPTIONS;
}

export function emptyRankingEntries(
  purposes: PurposeOption[] = ALL_RANKING_PURPOSE_OPTIONS,
): RankingEntryDraft[] {
  return emptyEntries(purposes);
}

function emptyEntries(
  purposes: PurposeOption[] = ALL_RANKING_PURPOSE_OPTIONS,
): RankingEntryDraft[] {
  const entries: RankingEntryDraft[] = [];
  for (const purpose of purposes) {
    for (const rank of [1, 2, 3] as const) {
      entries.push({
        purpose_id: purpose.id,
        rank,
        service_id: null,
        plan_id: null,
        rating: null,
        card_comment: "",
        sub_comment: "",
        is_visible: true,
      });
    }
  }
  return entries;
}

function normalizeRating(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  const clamped = Math.min(5, Math.max(0, n));
  return Math.round(clamped * 10) / 10;
}

function asPayload(
  raw: unknown,
  purposes: PurposeOption[],
): RankingDraftPayload {
  if (!raw || typeof raw !== "object") {
    return { entries: emptyEntries(purposes) };
  }
  const obj = raw as { entries?: unknown };
  if (!Array.isArray(obj.entries)) {
    return { entries: emptyEntries(purposes) };
  }
  const purposeIds = new Set(purposes.map((p) => p.id));
  const byKey = new Map<string, RankingEntryDraft>();
  for (const row of obj.entries) {
    if (!row || typeof row !== "object") continue;
    const e = row as Partial<RankingEntryDraft>;
    if (!e.purpose_id || !purposeIds.has(String(e.purpose_id))) continue;
    if (![1, 2, 3].includes(Number(e.rank))) continue;
    byKey.set(`${e.purpose_id}:${e.rank}`, {
      purpose_id: String(e.purpose_id),
      rank: Number(e.rank) as 1 | 2 | 3,
      service_id: e.service_id ? String(e.service_id) : null,
      plan_id: e.plan_id ? String(e.plan_id) : null,
      rating: normalizeRating(e.rating),
      card_comment: String(e.card_comment ?? ""),
      sub_comment: String(e.sub_comment ?? ""),
      is_visible: e.is_visible !== false,
    });
  }
  return {
    entries: emptyEntries(purposes).map(
      (slot) => byKey.get(`${slot.purpose_id}:${slot.rank}`) ?? slot,
    ),
  };
}

export function validateRankingEntries(
  entries: RankingEntryDraft[],
  purposes: PurposeOption[] = ALL_RANKING_PURPOSE_OPTIONS,
): string | null {
  for (const purpose of purposes) {
    const rows = entries.filter((e) => e.purpose_id === purpose.id);
    if (rows.length === 0) continue;
    const serviceIds = rows
      .map((e) => e.service_id)
      .filter((id): id is string => Boolean(id));
    if (new Set(serviceIds).size !== serviceIds.length) {
      return `「${purpose.label}」で同じサービスが重複しています。`;
    }
    for (const row of rows) {
      if (row.rating == null) continue;
      if (row.rating < 0 || row.rating > 5) {
        return `「${purpose.label}」${row.rank}位の評価は 0〜5 で入力してください。`;
      }
    }
  }
  return null;
}

async function resolveDictionarySlug(
  supabase: Client,
  dictionaryId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("dictionaries")
    .select("slug")
    .eq("id", dictionaryId)
    .maybeSingle();
  return data?.slug ?? null;
}

export async function ensureRankingDraft(
  supabase: Client,
  dictionaryId: string,
  purposes?: PurposeOption[],
): Promise<{
  draft: {
    id: string;
    dictionary_id: string;
    payload: RankingDraftPayload;
    published_snapshot: RankingDraftPayload | null;
    change_count: number;
    status: string;
  } | null;
  errorMessage: string | null;
}> {
  if (!dictionaryId) {
    return { draft: null, errorMessage: "dictionary_id が必要です。" };
  }

  const slug = await resolveDictionarySlug(supabase, dictionaryId);
  const purposeOptions =
    purposes ?? purposesForDictionarySlug(slug ?? "server");

  const { data: existing, error } = await supabase
    .from("cms_ranking_drafts")
    .select("*")
    .eq("dictionary_id", dictionaryId)
    .maybeSingle();

  if (error) {
    const missingDictCol =
      /dictionary_id/i.test(error.message) || error.code === "42703";
    return {
      draft: null,
      errorMessage:
        error.code === "42P01" ||
        /does not exist|schema cache/i.test(error.message)
          ? "テーブル未作成: マイグレーション 202607220002 / 202607230007 を適用してください。"
          : missingDictCol
            ? "dictionary_id 未適用: マイグレーション 202607230007_ranking_dictionary_id.sql を適用してください。"
            : `読み取り失敗: ${error.message}`,
    };
  }

  if (existing) {
    return {
      draft: {
        ...existing,
        dictionary_id: existing.dictionary_id ?? dictionaryId,
        payload: asPayload(existing.payload, purposeOptions),
        published_snapshot: existing.published_snapshot
          ? asPayload(existing.published_snapshot, purposeOptions)
          : null,
      },
      errorMessage: null,
    };
  }

  const payload = { entries: emptyEntries(purposeOptions) };
  const { data: live } = await supabase
    .from("ranking_entries")
    .select("*")
    .eq("dictionary_id", dictionaryId);
  if (live?.length) {
    for (const row of live) {
      const slot = payload.entries.find(
        (e) => e.purpose_id === row.purpose_id && e.rank === row.rank,
      );
      if (!slot) continue;
      slot.service_id = row.service_id;
      slot.plan_id = row.plan_id;
      slot.rating = normalizeRating(row.rating);
      slot.card_comment = row.card_comment ?? "";
      slot.sub_comment = row.sub_comment ?? "";
      slot.is_visible = row.is_visible !== false;
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("cms_ranking_drafts")
    .insert({
      dictionary_id: dictionaryId,
      payload: payload as unknown as Json,
      published_snapshot: live?.length
        ? (payload as unknown as Json)
        : null,
      status: live?.length ? "published" : "draft",
      change_count: 0,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    const msg = insertError?.message ?? "下書きの初期化に失敗しました。";
    const rls =
      insertError?.code === "42501" || /row-level security/i.test(msg);
    return {
      draft: null,
      errorMessage: rls
        ? "RLS により下書きを作成できません。マイグレーション 202607220003_ranking_rls.sql を適用してください。"
        : `初期化失敗: ${msg}`,
    };
  }

  return {
    draft: {
      ...inserted,
      dictionary_id: inserted.dictionary_id ?? dictionaryId,
      payload: asPayload(inserted.payload, purposeOptions),
      published_snapshot: inserted.published_snapshot
        ? asPayload(inserted.published_snapshot, purposeOptions)
        : null,
    },
    errorMessage: null,
  };
}

export async function saveRankingDraft(
  supabase: Client,
  dictionaryId: string,
  payload: RankingDraftPayload,
  userId: string | null,
  purposes?: PurposeOption[],
) {
  const slug = await resolveDictionarySlug(supabase, dictionaryId);
  const purposeOptions =
    purposes ?? purposesForDictionarySlug(slug ?? "server");

  const validation = validateRankingEntries(payload.entries, purposeOptions);
  if (validation) return { ok: false as const, message: validation };

  const normalized = asPayload(payload, purposeOptions);

  const { draft: current, errorMessage } = await ensureRankingDraft(
    supabase,
    dictionaryId,
    purposeOptions,
  );
  if (!current) {
    return {
      ok: false as const,
      message:
        errorMessage ??
        "ランキング下書きテーブルがありません。マイグレーションを適用してください。",
    };
  }

  const changeCount =
    JSON.stringify(normalized) ===
    JSON.stringify(current.published_snapshot ?? {})
      ? 0
      : 1;

  const { error } = await supabase
    .from("cms_ranking_drafts")
    .update({
      payload: normalized as unknown as Json,
      status: changeCount > 0 ? "pending_review" : "published",
      change_count: changeCount,
      last_change_source: "admin",
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id)
    .eq("dictionary_id", dictionaryId);

  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, changeCount };
}

export async function publishRankingDraft(
  supabase: Client,
  dictionaryId: string,
  userId: string | null,
  purposes?: PurposeOption[],
) {
  const slug = await resolveDictionarySlug(supabase, dictionaryId);
  const purposeOptions =
    purposes ?? purposesForDictionarySlug(slug ?? "server");

  const { draft: current, errorMessage } = await ensureRankingDraft(
    supabase,
    dictionaryId,
    purposeOptions,
  );
  if (!current) {
    return {
      ok: false as const,
      message: errorMessage ?? "ランキング下書きが見つかりません。",
    };
  }

  const validation = validateRankingEntries(
    current.payload.entries,
    purposeOptions,
  );
  if (validation) return { ok: false as const, message: validation };

  const oldByKey = new Map<string, RankingEntryDraft>(
    (current.published_snapshot?.entries ?? []).map(
      (e: RankingEntryDraft) => [`${e.purpose_id}:${e.rank}`, e],
    ),
  );

  // 当該図鑑の公開行のみ削除（他図鑑を消さない）
  const { error: deleteError } = await supabase
    .from("ranking_entries")
    .delete()
    .eq("dictionary_id", dictionaryId);
  if (deleteError) {
    return { ok: false as const, message: deleteError.message };
  }

  const rows = current.payload.entries
    .filter((e: RankingEntryDraft) => e.service_id)
    .map((e: RankingEntryDraft) => ({
      dictionary_id: dictionaryId,
      purpose_id: e.purpose_id,
      rank: e.rank,
      service_id: e.service_id,
      plan_id: e.plan_id,
      rating: e.rating,
      card_comment: e.card_comment || null,
      sub_comment: e.sub_comment || null,
      is_visible: e.is_visible,
      display_order: e.rank,
    }));

  if (rows.length) {
    const { error } = await supabase.from("ranking_entries").insert(rows);
    if (error) return { ok: false as const, message: error.message };
  }

  const history = [];
  for (const entry of current.payload.entries) {
    const key = `${entry.purpose_id}:${entry.rank}`;
    const old = oldByKey.get(key);
    if (JSON.stringify(old ?? null) === JSON.stringify(entry)) continue;
    history.push({
      dictionary_id: dictionaryId,
      purpose_id: entry.purpose_id,
      rank: entry.rank,
      service_id: entry.service_id,
      plan_id: entry.plan_id,
      card_comment: entry.card_comment || null,
      sub_comment: entry.sub_comment || null,
      old_value: (old as unknown as Json) ?? null,
      new_value: entry as unknown as Json,
      published_by: userId,
    });
  }
  if (history.length) {
    await supabase.from("ranking_publish_history").insert(history);
  }

  const { error: draftUpdateError } = await supabase
    .from("cms_ranking_drafts")
    .update({
      published_snapshot: current.payload as unknown as Json,
      status: "published",
      change_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id)
    .eq("dictionary_id", dictionaryId);

  if (draftUpdateError) {
    return { ok: false as const, message: draftUpdateError.message };
  }

  revalidateRankingCache(dictionaryId);
  return { ok: true as const, changeCount: history.length };
}

export async function discardRankingDraft(
  supabase: Client,
  dictionaryId: string,
  purposes?: PurposeOption[],
) {
  const slug = await resolveDictionarySlug(supabase, dictionaryId);
  const purposeOptions =
    purposes ?? purposesForDictionarySlug(slug ?? "server");

  const { draft: current, errorMessage } = await ensureRankingDraft(
    supabase,
    dictionaryId,
    purposeOptions,
  );
  if (!current) {
    return {
      ok: false as const,
      message: errorMessage ?? "下書きがありません。",
    };
  }
  const restored =
    current.published_snapshot ?? { entries: emptyEntries(purposeOptions) };
  const { error } = await supabase
    .from("cms_ranking_drafts")
    .update({
      payload: restored as unknown as Json,
      status: "published",
      change_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id)
    .eq("dictionary_id", dictionaryId);
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}

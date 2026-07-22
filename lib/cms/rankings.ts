import type { SupabaseClient } from "@supabase/supabase-js";
import { RANKING_PURPOSE_OPTIONS } from "@/lib/site/content";
import { revalidatePublicSiteCache } from "@/lib/site/cache";

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

export function emptyRankingEntries(): RankingEntryDraft[] {
  return emptyEntries();
}

function emptyEntries(): RankingEntryDraft[] {
  const entries: RankingEntryDraft[] = [];
  for (const purpose of RANKING_PURPOSE_OPTIONS) {
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
  // 0.1 刻みに丸め（4.5 など）
  return Math.round(clamped * 10) / 10;
}

function asPayload(raw: unknown): RankingDraftPayload {
  if (!raw || typeof raw !== "object") return { entries: emptyEntries() };
  const obj = raw as { entries?: unknown };
  if (!Array.isArray(obj.entries)) return { entries: emptyEntries() };
  const byKey = new Map<string, RankingEntryDraft>();
  for (const row of obj.entries) {
    if (!row || typeof row !== "object") continue;
    const e = row as Partial<RankingEntryDraft>;
    if (!e.purpose_id || ![1, 2, 3].includes(Number(e.rank))) continue;
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
    entries: emptyEntries().map(
      (slot) => byKey.get(`${slot.purpose_id}:${slot.rank}`) ?? slot,
    ),
  };
}

export function validateRankingEntries(
  entries: RankingEntryDraft[],
): string | null {
  for (const purpose of RANKING_PURPOSE_OPTIONS) {
    const rows = entries.filter((e) => e.purpose_id === purpose.id);
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

export async function ensureRankingDraft(supabase: Client): Promise<{
  draft: {
    id: string;
    payload: RankingDraftPayload;
    published_snapshot: RankingDraftPayload | null;
    change_count: number;
    status: string;
  } | null;
  errorMessage: string | null;
}> {
  const { data: existing, error } = await supabase
    .from("cms_ranking_drafts")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      draft: null,
      errorMessage:
        error.code === "42P01" || /does not exist|schema cache/i.test(error.message)
          ? "テーブル未作成: マイグレーション 202607220002 を適用してください。"
          : `読み取り失敗: ${error.message}`,
    };
  }

  if (existing) {
    return {
      draft: {
        ...existing,
        payload: asPayload(existing.payload),
        published_snapshot: existing.published_snapshot
          ? asPayload(existing.published_snapshot)
          : null,
      },
      errorMessage: null,
    };
  }

  const payload = { entries: emptyEntries() };
  const { data: live } = await supabase.from("ranking_entries").select("*");
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
      insertError?.code === "42501" ||
      /row-level security/i.test(msg);
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
      payload: asPayload(inserted.payload),
      published_snapshot: inserted.published_snapshot
        ? asPayload(inserted.published_snapshot)
        : null,
    },
    errorMessage: null,
  };
}

export async function saveRankingDraft(
  supabase: Client,
  payload: RankingDraftPayload,
  userId: string | null,
) {
  const validation = validateRankingEntries(payload.entries);
  if (validation) return { ok: false as const, message: validation };

  const { draft: current, errorMessage } = await ensureRankingDraft(supabase);
  if (!current) {
    return {
      ok: false as const,
      message:
        errorMessage ??
        "ランキング下書きテーブルがありません。マイグレーションを適用してください。",
    };
  }

  const changeCount =
    JSON.stringify(payload) === JSON.stringify(current.published_snapshot ?? {})
      ? 0
      : 1;

  const { error } = await supabase
    .from("cms_ranking_drafts")
    .update({
      payload: payload as unknown as Json,
      status: changeCount > 0 ? "pending_review" : "published",
      change_count: changeCount,
      last_change_source: "admin",
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id);

  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, changeCount };
}

export async function publishRankingDraft(
  supabase: Client,
  userId: string | null,
) {
  const { draft: current, errorMessage } = await ensureRankingDraft(supabase);
  if (!current) {
    return {
      ok: false as const,
      message: errorMessage ?? "ランキング下書きが見つかりません。",
    };
  }

  const validation = validateRankingEntries(current.payload.entries);
  if (validation) return { ok: false as const, message: validation };

  const oldByKey = new Map<string, RankingEntryDraft>(
    (current.published_snapshot?.entries ?? []).map(
      (e: RankingEntryDraft) => [`${e.purpose_id}:${e.rank}`, e],
    ),
  );

  await supabase.from("ranking_entries").delete().gte("rank", 1);

  const rows = current.payload.entries
    .filter((e: RankingEntryDraft) => e.service_id)
    .map((e: RankingEntryDraft) => ({
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

  await supabase
    .from("cms_ranking_drafts")
    .update({
      published_snapshot: current.payload as unknown as Json,
      status: "published",
      change_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id);

  revalidatePublicSiteCache();
  return { ok: true as const, changeCount: history.length };
}

export async function discardRankingDraft(supabase: Client) {
  const { draft: current, errorMessage } = await ensureRankingDraft(supabase);
  if (!current) {
    return {
      ok: false as const,
      message: errorMessage ?? "下書きがありません。",
    };
  }
  const restored = current.published_snapshot ?? { entries: emptyEntries() };
  const { error } = await supabase
    .from("cms_ranking_drafts")
    .update({
      payload: restored as unknown as Json,
      status: "published",
      change_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id);
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emptyRankingEntries,
  saveRankingDraft,
  type RankingDraftPayload,
  type RankingEntryDraft,
} from "@/lib/cms/rankings";
import { RANKING_PURPOSE_OPTIONS } from "@/lib/site/content";
import type { SheetRecords } from "@/lib/spreadsheet/google-sheets";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

function parseBool(raw: string | undefined, fallback = true): boolean {
  if (raw == null || raw === "") return fallback;
  const v = String(raw).trim().toLowerCase();
  if (["false", "0", "no", "off", "非表示", "ng"].includes(v)) return false;
  if (["true", "1", "yes", "on", "表示", "ok"].includes(v)) return true;
  return fallback;
}

/**
 * rankings シートをドラフトへ取り込む（直接公開しない）。
 */
export async function importRankingsSheetToDraft(params: {
  supabase: Client;
  sheet: SheetRecords;
  userId: string | null;
  /** service_id / slug → id */
  serviceIdByKey: Map<string, string>;
  /** plan_id / `${serviceId}:${planName}` → id */
  planIdByKey: Map<string, string>;
}): Promise<{ ok: boolean; message: string; imported: number }> {
  const { supabase, sheet, userId, serviceIdByKey, planIdByKey } = params;
  if (sheet.missing) {
    return { ok: true, message: "rankingsシートなし（スキップ）", imported: 0 };
  }
  if (!sheet.rows.length) {
    return { ok: true, message: "rankingsシートが空です", imported: 0 };
  }

  const byKey = new Map<string, RankingEntryDraft>();
  for (const slot of emptyRankingEntries()) {
    byKey.set(`${slot.purpose_id}:${slot.rank}`, { ...slot });
  }

  let imported = 0;
  for (const row of sheet.rows) {
    const purposeId = String(row.category_slug ?? "").trim();
    const rankNum = Number(row.rank);
    if (!RANKING_PURPOSE_OPTIONS.some((p) => p.id === purposeId)) continue;
    if (![1, 2, 3].includes(rankNum)) continue;

    const serviceKey =
      String(row.service_id ?? "").trim() ||
      String(row.service_slug ?? "").trim();
    const serviceId = serviceKey
      ? (serviceIdByKey.get(serviceKey) ?? null)
      : null;

    let planId: string | null = null;
    const planKey = String(row.plan_id ?? "").trim();
    const planName = String(row.plan_name ?? "").trim();
    if (planKey && planIdByKey.has(planKey)) {
      planId = planIdByKey.get(planKey) ?? null;
    } else if (serviceId && planName) {
      planId = planIdByKey.get(`${serviceId}:${planName}`) ?? null;
    }

    byKey.set(`${purposeId}:${rankNum}`, {
      purpose_id: purposeId,
      rank: rankNum as 1 | 2 | 3,
      service_id: serviceId,
      plan_id: planId,
      rating:
        row.rating === "" || row.rating == null
          ? null
          : Number(row.rating),
      card_comment: String(row.card_comment ?? ""),
      sub_comment: String(row.sub_comment ?? ""),
      is_visible: parseBool(row.is_visible, true),
    });
    imported += 1;
  }

  const payload: RankingDraftPayload = {
    entries: emptyRankingEntries().map(
      (slot) => byKey.get(`${slot.purpose_id}:${slot.rank}`) ?? slot,
    ),
  };

  const saved = await saveRankingDraft(supabase, payload, userId);
  if (!saved.ok) {
    return { ok: false, message: saved.message, imported: 0 };
  }
  return {
    ok: true,
    message: `ランキングを下書きへ取り込みました（${imported}行）`,
    imported,
  };
}

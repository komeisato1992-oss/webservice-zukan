/**
 * ランキング図鑑分離の適用確認 + データ復旧。
 *
 * 前提: supabase/migrations/202607230007_ranking_dictionary_id.sql を適用済み。
 *
 *   npx tsx scripts/repair-ranking-dictionary-separation.ts
 */
import { createClient } from "@supabase/supabase-js";
import {
  DOMAIN_RANKING_PURPOSE_OPTIONS,
  RANKING_PURPOSE_OPTIONS,
  type PurposeOption,
} from "../lib/site/content";
import { emptyRankingEntries } from "../lib/cms/rankings";

type EntryLike = {
  purpose_id: string;
  rank: 1 | 2 | 3;
  service_id: string | null;
  plan_id: string | null;
  rating: number | null;
  card_comment: string;
  sub_comment: string;
  is_visible: boolean;
};

function emptyPayload(purposes: PurposeOption[]) {
  return { entries: emptyRankingEntries(purposes) };
}

function fillFromRows(
  purposes: PurposeOption[],
  rows: Array<Record<string, unknown>>,
) {
  const payload = emptyPayload(purposes);
  for (const row of rows) {
    const slot = payload.entries.find(
      (e) => e.purpose_id === row.purpose_id && e.rank === Number(row.rank),
    );
    if (!slot) continue;
    slot.service_id = (row.service_id as string | null) ?? null;
    slot.plan_id = (row.plan_id as string | null) ?? null;
    slot.rating =
      row.rating == null || row.rating === ""
        ? null
        : Number(row.rating);
    slot.card_comment = String(row.card_comment ?? "");
    slot.sub_comment = String(row.sub_comment ?? "");
    slot.is_visible = row.is_visible !== false;
  }
  return payload;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env missing");

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // schema check
  const probe = await sb
    .from("ranking_entries")
    .select("id, dictionary_id")
    .limit(1);
  if (probe.error && /dictionary_id/i.test(probe.error.message)) {
    throw new Error(
      "dictionary_id 未適用です。先に 202607230007_ranking_dictionary_id.sql を SQL Editor で実行してください。",
    );
  }
  if (probe.error) throw new Error(probe.error.message);

  const { data: dicts, error: dictErr } = await sb
    .from("dictionaries")
    .select("id, slug");
  if (dictErr) throw new Error(dictErr.message);
  const serverId = dicts?.find((d) => d.slug === "server")?.id;
  const domainId = dicts?.find((d) => d.slug === "domain")?.id;
  if (!serverId || !domainId) {
    throw new Error("server/domain dictionary が見つかりません");
  }

  // Restore server overall from publish history if currently missing or domain-owned
  const { data: serverOverall } = await sb
    .from("ranking_entries")
    .select("id, purpose_id, rank, service_id")
    .eq("dictionary_id", serverId)
    .eq("purpose_id", "overall")
    .order("rank");

  if (!serverOverall?.length) {
    console.log("Restoring server overall from ranking_publish_history...");
    const { data: hist } = await sb
      .from("ranking_publish_history")
      .select("rank, old_value, published_at")
      .eq("purpose_id", "overall")
      .order("published_at", { ascending: false })
      .limit(20);

    // Find the most recent batch that overwrote with domain services;
    // use old_value from that batch (2026-07-23T09:06:51)
    const byRank = new Map<number, EntryLike>();
    for (const h of hist ?? []) {
      const old = h.old_value as EntryLike | null;
      if (!old?.service_id || !old.rank) continue;
      if (byRank.has(Number(old.rank))) continue;
      // verify service belongs to server
      const { data: svc } = await sb
        .from("services")
        .select("id, dictionary_id, name")
        .eq("id", old.service_id)
        .maybeSingle();
      if (!svc || svc.dictionary_id !== serverId) continue;
      byRank.set(Number(old.rank), {
        purpose_id: "overall",
        rank: Number(old.rank) as 1 | 2 | 3,
        service_id: old.service_id,
        plan_id: old.plan_id ?? null,
        rating: old.rating ?? null,
        card_comment: old.card_comment ?? "",
        sub_comment: old.sub_comment ?? "",
        is_visible: old.is_visible !== false,
      });
      if (byRank.size >= 3) break;
    }

    if (byRank.size === 0) {
      console.warn(
        "⚠ サーバー総合おすすめの復旧元（history.old_value）が見つかりません。手動復旧が必要です。",
      );
    } else {
      const rows = [...byRank.values()].map((e) => ({
        dictionary_id: serverId,
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
      const { error } = await sb.from("ranking_entries").upsert(rows, {
        onConflict: "dictionary_id,purpose_id,rank",
      });
      if (error) throw new Error(`overall restore failed: ${error.message}`);
      console.log(
        "Restored server overall:",
        rows.map((r) => `${r.rank}:${r.service_id}`).join(", "),
      );
    }
  } else {
    console.log("Server overall already present:", serverOverall.length);
  }

  // Restore domain overall from backup / history if missing after server overall restore
  const { data: domainOverall } = await sb
    .from("ranking_entries")
    .select("rank, service_id")
    .eq("dictionary_id", domainId)
    .eq("purpose_id", "overall")
    .order("rank");

  if (!domainOverall?.length) {
    console.log("Restoring domain overall from history new_value / backup...");
    const backupPath = "tmp/domain-overall-backup.json";
    let domainRows: Array<{
      rank: number;
      service_id: string;
      rating: number | null;
      card_comment: string;
    }> = [];
    try {
      const fs = await import("fs");
      if (fs.existsSync(backupPath)) {
        domainRows = JSON.parse(fs.readFileSync(backupPath, "utf8"));
      }
    } catch {
      // ignore
    }
    if (!domainRows.length) {
      const { data: hist } = await sb
        .from("ranking_publish_history")
        .select("rank, new_value, published_at")
        .eq("purpose_id", "overall")
        .gte("published_at", "2026-07-23T09:06:00")
        .lte("published_at", "2026-07-23T09:07:00")
        .order("rank");
      for (const h of hist ?? []) {
        const neu = h.new_value as {
          rank?: number;
          service_id?: string;
          rating?: number | null;
          card_comment?: string;
        } | null;
        if (!neu?.service_id || !neu.rank) continue;
        const { data: svc } = await sb
          .from("services")
          .select("dictionary_id")
          .eq("id", neu.service_id)
          .maybeSingle();
        if (svc?.dictionary_id !== domainId) continue;
        domainRows.push({
          rank: Number(neu.rank),
          service_id: neu.service_id,
          rating: neu.rating ?? null,
          card_comment: neu.card_comment ?? "",
        });
      }
    }
    if (domainRows.length) {
      const rows = domainRows.map((e) => ({
        dictionary_id: domainId,
        purpose_id: "overall",
        rank: e.rank,
        service_id: e.service_id,
        plan_id: null,
        rating: e.rating,
        card_comment: e.card_comment || null,
        sub_comment: null,
        is_visible: true,
        display_order: e.rank,
      }));
      const { error } = await sb.from("ranking_entries").upsert(rows, {
        onConflict: "dictionary_id,purpose_id,rank",
      });
      if (error) throw new Error(`domain overall restore failed: ${error.message}`);
      console.log("Restored domain overall:", rows.length);
    } else {
      console.warn("⚠ ドメイン総合おすすめの復旧元が見つかりません。");
    }
  } else {
    console.log("Domain overall already present:", domainOverall.length);
  }

  // Rebuild drafts from live entries per dictionary
  async function syncDraft(dictionaryId: string, purposes: PurposeOption[]) {
    const { data: live } = await sb
      .from("ranking_entries")
      .select(
        "purpose_id, rank, service_id, plan_id, rating, card_comment, sub_comment, is_visible",
      )
      .eq("dictionary_id", dictionaryId);
    const payload = fillFromRows(purposes, live ?? []);

    const { data: existing } = await sb
      .from("cms_ranking_drafts")
      .select("id")
      .eq("dictionary_id", dictionaryId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await sb
        .from("cms_ranking_drafts")
        .update({
          payload,
          published_snapshot: payload,
          status: "published",
          change_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("dictionary_id", dictionaryId);
      if (error) throw new Error(error.message);
      console.log("Updated draft", dictionaryId);
    } else {
      const { error } = await sb.from("cms_ranking_drafts").insert({
        dictionary_id: dictionaryId,
        payload,
        published_snapshot: payload,
        status: "published",
        change_count: 0,
      });
      if (error) throw new Error(error.message);
      console.log("Inserted draft", dictionaryId);
    }
  }

  await syncDraft(serverId, RANKING_PURPOSE_OPTIONS);
  await syncDraft(domainId, DOMAIN_RANKING_PURPOSE_OPTIONS);

  // Summary
  const { data: all } = await sb
    .from("ranking_entries")
    .select("dictionary_id, purpose_id, rank, service_id");
  const serverRows = (all ?? []).filter((r) => r.dictionary_id === serverId);
  const domainRows = (all ?? []).filter((r) => r.dictionary_id === domainId);
  console.log("=== SUMMARY ===");
  console.log("server entries", serverRows.length);
  console.log("domain entries", domainRows.length);
  console.log(
    "server overall",
    serverRows
      .filter((r) => r.purpose_id === "overall")
      .map((r) => r.rank)
      .join(","),
  );
  console.log(
    "domain overall",
    domainRows
      .filter((r) => r.purpose_id === "overall")
      .map((r) => r.rank)
      .join(","),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

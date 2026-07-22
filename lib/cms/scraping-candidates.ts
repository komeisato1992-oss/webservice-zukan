import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/types/database";
import type { ScrapeDiffItem } from "@/lib/scraping/types";

type Client = SupabaseClient<Database>;

function confidenceScore(
  confidence: ScrapeDiffItem["confidence"] | undefined,
): number | null {
  if (confidence === "high") return 0.9;
  if (confidence === "medium") return 0.6;
  if (confidence === "low") return 0.3;
  return null;
}

/** Persist scrape diffs as review candidates (draft only — never publish). */
export async function persistScrapingCandidates(
  supabase: Client,
  args: {
    serviceId: string;
    scrapingRunId: string;
    diffs: ScrapeDiffItem[];
  },
): Promise<number> {
  const pending = args.diffs.filter(
    (d) =>
      d.changeKind === "changed" ||
      d.changeKind === "added" ||
      d.changeKind === "ambiguous",
  );
  if (!pending.length) return 0;

  // Clear previous pending for same field keys on this service (keep history via runs)
  const fieldKeys = pending.map((d) => d.fieldKey);
  await supabase
    .from("scraping_candidates")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("service_id", args.serviceId)
    .eq("status", "pending")
    .in("field_key", fieldKeys);

  const rows = pending.map((d) => ({
    scraping_run_id: args.scrapingRunId,
    service_id: args.serviceId,
    plan_id: d.planId ?? null,
    field_key: d.fieldKey,
    field_label: d.label,
    current_published_value: (d.currentValue as Json) ?? null,
    current_draft_value: (d.currentValue as Json) ?? null,
    candidate_value: (d.applyValue as Json) ?? (d.suggestedValue as Json) ?? null,
    evidence: d.rawValue ?? d.warning ?? d.suggestedValue ?? null,
    source_url: d.sourceUrl ?? null,
    confidence: confidenceScore(d.confidence),
    fetched_at: new Date().toISOString(),
    status: "pending",
  }));

  const { error } = await supabase.from("scraping_candidates").insert(rows);
  if (error) {
    console.error("[scraping_candidates] insert failed", error.message);
    return 0;
  }
  return rows.length;
}

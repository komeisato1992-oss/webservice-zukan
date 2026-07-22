import { registerAfterBuildHandler } from "@/lib/scraping/engine/registry";
import { createEmptyField } from "@/lib/scraping/types";
import { normalize } from "@/lib/scraping/normalize";

/** heteml: 料金表に容量行がないためページ訴求から補完 */
registerAfterBuildHandler("heteml-storage", ({ plans, comparisonValues, pageData }) => {
  const text = Object.values(pageData)
    .map((d) =>
      d && typeof d === "object" && "pageText" in d
        ? String((d as { pageText: string }).pageText)
        : "",
    )
    .join("\n");
  const storageMatch = text.match(/容量（SSD）\s*([\d,]+)\s*(GB|TB)/i);
  if (!storageMatch) {
    return { plans, comparisonValues };
  }
  const raw = `${storageMatch[1]}${storageMatch[2]}`;
  const storage = normalize.storage(raw);
  const sourceUrl =
    (Object.values(pageData).find(
      (d) => d && typeof d === "object" && "sourceUrl" in d,
    ) as { sourceUrl?: string } | undefined)?.sourceUrl ?? "";

  const nextPlans = plans.map((plan) => ({
    ...plan,
    storageValue: createEmptyField<number>("storageValue", "容量", sourceUrl, {
      value: storage.value,
      rawValue: raw,
      confidence: "medium",
      status: storage.value != null ? "found" : "not_found",
      warning: "料金ページ見出しの容量表記から補完しています。",
      inferred: true,
    }),
    storageUnit: createEmptyField<string>("storageUnit", "容量単位", sourceUrl, {
      value: storage.unit,
      rawValue: raw,
      confidence: "medium",
      status: storage.unit ? "found" : "not_found",
      inferred: true,
    }),
  }));

  return { plans: nextPlans, comparisonValues };
});

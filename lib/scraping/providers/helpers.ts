import {
  collectEvidenceText,
  mergeSupportComparisonValues,
} from "@/lib/scraping/support-extract";
import type {
  ScrapedComparisonValue,
  ScrapedPlan,
  ScrapedServiceData,
} from "@/lib/scraping/types";

export function countFoundFields(
  plans: ScrapedPlan[],
  comparisonValues: ScrapedComparisonValue[],
): number {
  return (
    plans.reduce((acc, plan) => {
      const fields = [
        plan.name,
        plan.regularMonthlyPrice,
        plan.campaignMonthlyPrice,
        plan.effectiveMonthlyPrice,
        plan.initialFee,
        plan.billingPeriod,
        plan.storageValue,
        plan.storageUnit,
      ];
      return acc + fields.filter((f) => f.status === "found").length;
    }, 0) + comparisonValues.filter((c) => c.status === "found").length
  );
}

export function markFromCellText(text: string): boolean | null {
  const t = text.replace(/\s+/g, "").trim();
  if (!t || t === "-" || t === "ー" || t === "－" || t === "×") return false;
  if (
    /受け付けていません|受付していません|受け付けません|対応していません|ありません|ございません|非対応|不可|なし|無し/.test(
      t,
    )
  ) {
    return false;
  }
  if (/^(○|〇|◯|あり|無料|対応|可)/.test(t)) return true;
  if (/無料|対応|あり|○|〇/.test(t) && !/なし|非対応|不可/.test(t)) return true;
  if (/なし|非対応|不可|×/.test(t)) return false;
  return null;
}

export function baseResult(
  ctx: { serviceSlug: string },
  provider: string,
  sourceUrls: string[],
  plans: ScrapedPlan[],
  comparisonValues: ScrapedComparisonValue[],
  warnings: string[],
  pageText?: string | null,
): ScrapedServiceData {
  const sourceUrl = sourceUrls[0] ?? "";
  const text =
    pageText?.trim() || collectEvidenceText(comparisonValues);
  const merged =
    text && sourceUrl
      ? mergeSupportComparisonValues(comparisonValues, text, sourceUrl)
      : comparisonValues;
  const foundFields = countFoundFields(plans, merged);
  return {
    serviceSlug: ctx.serviceSlug,
    provider,
    fetchedAt: new Date().toISOString(),
    sourceUrls,
    plans,
    comparisonValues: merged,
    warnings,
    success: foundFields > 0,
    errorMessage: null,
    pageText: pageText ?? null,
  };
}

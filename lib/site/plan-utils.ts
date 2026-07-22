import type { ComparisonValue, ServicePlan } from "@/lib/types/database";
import { formatPrice } from "@/lib/types/comparison";
import type { EnrichedService } from "@/lib/site/service-utils";
import { formatPlanLabelFromPlan } from "@/lib/site/service-name-display";

/**
 * 比較表の初期表示プランを選ぶ。
 * 1. is_default_comparison_plan（代表）
 * 2. 公開中のみ
 * 3. display_order 昇順
 * 4. is_recommended（推奨）
 * ※最安プラン優先にはしない
 */
export function pickRepresentativePlan(
  plans: ServicePlan[],
): ServicePlan | null {
  const published = plans
    .filter((p) => p.is_published)
    .slice()
    .sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      if (Boolean(a.is_recommended) !== Boolean(b.is_recommended)) {
        return a.is_recommended ? -1 : 1;
      }
      return a.name.localeCompare(b.name, "ja");
    });

  if (published.length === 0) return null;

  const marked = published.find((p) => p.is_default_comparison_plan);
  if (marked) return marked;

  return published[0] ?? null;
}

export function planMonthlyPrice(plan: ServicePlan | null): number | null {
  if (!plan) return null;
  return (
    plan.effective_monthly_price ??
    plan.campaign_monthly_price ??
    plan.regular_monthly_price
  );
}

/** 選択表示: プラン名のみ / 一覧: プラン名（¥990） */
export function formatPlanOptionLabel(
  plan: ServicePlan,
  opts?: { includePrice?: boolean },
): string {
  const label = formatPlanLabelFromPlan(plan) || plan.name;
  if (!opts?.includePrice) return label;
  const price = planMonthlyPrice(plan);
  if (price == null) return label;
  return `${label}（${formatPrice(price)}）`;
}

/**
 * サービス単位の比較値に、プラン単位の値を上書きマージする。
 * プラン固有値がある項目だけ差し替え、サービス共通は残す。
 */
export function mergeComparisonValues(
  serviceLevel: Record<string, ComparisonValue>,
  planLevel: Record<string, ComparisonValue> | undefined,
): Record<string, ComparisonValue> {
  if (!planLevel || Object.keys(planLevel).length === 0) {
    return serviceLevel;
  }
  return { ...serviceLevel, ...planLevel };
}

/** 選択プランで比較表示用の EnrichedService を組み立てる */
export function withSelectedPlan(
  item: EnrichedService,
  planId: string | null | undefined,
): EnrichedService {
  const plans = item.plans ?? [];
  const plan =
    (planId ? plans.find((p) => p.id === planId) : null) ??
    item.representativePlan ??
    pickRepresentativePlan(plans);

  const planValues =
    plan && item.comparisonByPlanId
      ? item.comparisonByPlanId[plan.id]
      : undefined;

  return {
    ...item,
    representativePlan: plan,
    comparisonByFieldId: mergeComparisonValues(
      item.comparisonByFieldId,
      planValues,
    ),
  };
}

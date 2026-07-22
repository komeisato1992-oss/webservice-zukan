import type {
  ComparisonField,
  ComparisonValue,
  ServicePlan,
} from "@/lib/types/database";
import { formatComparisonDisplay } from "@/lib/types/comparison";
import type {
  DiffChangeKind,
  PlanMatchKind,
  ScrapeDiffItem,
  ScrapedField,
  ScrapedServiceData,
} from "@/lib/scraping/types";
import { planMatchKey } from "@/lib/scraping/utils/text";

const AMBIGUOUS_PLAN_KEYS = new Set([
  "campaign_monthly_price",
  "effective_monthly_price",
]);

function displaySuggested(
  value: string | number | boolean | null,
  opts?: { money?: boolean; unit?: string | null },
): string | null {
  if (value == null) return null;
  if (typeof value === "boolean") return value ? "あり" : "なし";
  if (typeof value === "number") {
    if (opts?.money) {
      return `${Number(value).toLocaleString("ja-JP")}円`;
    }
    const base = Number(value).toLocaleString("ja-JP");
    return opts?.unit ? `${base}${opts.unit}` : base;
  }
  return value;
}

function displayMoney(value: number | null | undefined): string | null {
  if (value == null) return null;
  return `${Number(value).toLocaleString("ja-JP")}円`;
}

function changeKindFor(
  current: string | null,
  suggested: string | null,
  status: ScrapedField["status"],
): DiffChangeKind {
  if (status === "ambiguous") return "ambiguous";
  if (status === "error") return "error";
  if (status === "not_found" || suggested == null) return "not_found";
  if (
    current == null ||
    current === "" ||
    current === "—" ||
    current === "-" ||
    current === "未確認"
  ) {
    return "added";
  }
  if (current === suggested) return "unchanged";
  return "changed";
}

function planColumnKey(fieldKey: string): string {
  if (fieldKey.startsWith("plan.")) return fieldKey.slice(5);
  if (fieldKey.startsWith("new_plan:")) {
    const rest = fieldKey.slice("new_plan:".length);
    const sep = rest.indexOf(":");
    if (sep > 0) return rest.slice(sep + 1);
  }
  return fieldKey;
}

function canApplyValue(item: {
  status: ScrapedField["status"];
  confidence: ScrapedField["confidence"];
  changeKind: DiffChangeKind;
  applyValue: string | number | boolean | null;
  fieldKey: string;
}): boolean {
  if (item.applyValue == null) return false;
  if (item.status === "ambiguous" || item.status === "error") return false;
  if (item.status === "not_found") return false;
  if (item.confidence === "low") return false;
  if (item.changeKind === "unchanged") return false;
  if (AMBIGUOUS_PLAN_KEYS.has(planColumnKey(item.fieldKey))) return false;
  return true;
}

/** 推奨候補（初期選択・推奨のみ選択で使用） */
export function isRecommendedSelection(item: ScrapeDiffItem): boolean {
  if (!item.selectable) return false;
  if (item.confidence !== "high") return false;
  if (item.inferred) return false;
  if (item.status !== "found") return false;
  if (item.warning) return false;
  if (AMBIGUOUS_PLAN_KEYS.has(planColumnKey(item.fieldKey))) return false;
  if (item.changeKind !== "added" && item.changeKind !== "changed") return false;
  if (item.isMissingComparisonField) return false;
  return true;
}

export function buildRecommendedSelection(
  diffs: ScrapeDiffItem[],
): Record<string, boolean> {
  return Object.fromEntries(
    diffs.map((d) => [d.id, isRecommendedSelection(d)]),
  );
}

type PlanMatch = {
  plan?: ServicePlan;
  kind: PlanMatchKind;
};

function matchPlanDetailed(
  plans: ServicePlan[],
  scrapedName: string,
  slugHint?: string | null,
  officialUrl?: string | null,
): PlanMatch {
  if (officialUrl) {
    const byUrl = plans.find(
      (p) => p.official_url && p.official_url === officialUrl,
    );
    if (byUrl) return { plan: byUrl, kind: "slug" };
  }

  if (slugHint) {
    const bySlug = plans.find((p) => p.slug === slugHint);
    if (bySlug) return { plan: bySlug, kind: "slug" };
  }

  const scrapedKey = planMatchKey(scrapedName);
  const exactName = plans.find(
    (p) => p.name === scrapedName || planMatchKey(p.name) === scrapedKey,
  );
  if (exactName) return { plan: exactName, kind: "name" };

  const normalizedHits = plans.filter((p) => {
    const key = planMatchKey(p.name);
    if (!key || !scrapedKey) return false;
    return key.includes(scrapedKey) || scrapedKey.includes(key);
  });
  if (normalizedHits.length === 1) {
    return { plan: normalizedHits[0], kind: "partial" };
  }
  // Ambiguous partial → do not auto-merge
  if (normalizedHits.length > 1) {
    return { kind: "unmatched" };
  }

  return { kind: "unmatched" };
}

export function buildScrapeDiff(params: {
  scraped: ScrapedServiceData;
  plans: ServicePlan[];
  comparisonFields: ComparisonField[];
  comparisonValues: ComparisonValue[];
}): ScrapeDiffItem[] {
  const { scraped, plans, comparisonFields, comparisonValues } = params;
  const items: ScrapeDiffItem[] = [];
  const valueMap = new Map(
    comparisonValues
      .filter((v) => v.plan_id == null)
      .map((v) => [v.comparison_field_id, v]),
  );

  scraped.plans.forEach((plan, planIndex) => {
    const planName = plan.name.value ?? `プラン${planIndex + 1}`;
    const matched = matchPlanDetailed(
      plans,
      planName,
      plan.slugHint,
      plan.officialUrl?.value,
    );
    const isNew = matched.kind === "unmatched";
    const planKey = plan.slugHint || planMatchKey(planName) || String(planIndex);

    const optionalString = (
      key: string,
      label: string,
      field: ScrapedField<string> | undefined,
      current: string | null | undefined,
    ) =>
      field
        ? {
            key,
            label,
            field: field as ScrapedField<string | number>,
            current: current ?? null,
            apply: field.value,
          }
        : null;

    const optionalNumber = (
      key: string,
      label: string,
      field: ScrapedField<number> | undefined,
      current: string | null,
      money?: boolean,
    ) =>
      field
        ? {
            key,
            label,
            field: field as ScrapedField<string | number>,
            current,
            apply: field.value,
            money,
          }
        : null;

    const fields = [
      {
        key: "name",
        label: "プラン名",
        field: plan.name as ScrapedField<string | number>,
        current: matched.plan?.name ?? null,
        apply: plan.name.value,
      },
      {
        key: "regular_monthly_price",
        label: "通常月額",
        field: plan.regularMonthlyPrice,
        current: displayMoney(matched.plan?.regular_monthly_price),
        apply: plan.regularMonthlyPrice.value,
        money: true,
      },
      {
        key: "campaign_monthly_price",
        label: "キャンペーン月額",
        field: plan.campaignMonthlyPrice,
        current: displayMoney(matched.plan?.campaign_monthly_price),
        apply: plan.campaignMonthlyPrice.value,
        money: true,
      },
      {
        key: "effective_monthly_price",
        label: "実質月額",
        field: plan.effectiveMonthlyPrice,
        current: displayMoney(matched.plan?.effective_monthly_price),
        apply: plan.effectiveMonthlyPrice.value,
        money: true,
      },
      {
        key: "initial_fee",
        label: "初期費用",
        field: plan.initialFee,
        current: displayMoney(matched.plan?.initial_fee),
        apply: plan.initialFee.value,
        money: true,
      },
      {
        key: "billing_period",
        label: "契約期間",
        field: plan.billingPeriod,
        current: matched.plan?.billing_period ?? null,
        apply: plan.billingPeriod.value,
      },
      {
        key: "storage_value",
        label: "容量",
        field: plan.storageValue,
        current:
          matched.plan?.storage_value != null
            ? String(matched.plan.storage_value)
            : null,
        apply: plan.storageValue.value,
      },
      {
        key: "storage_unit",
        label: "容量単位",
        field: plan.storageUnit,
        current: matched.plan?.storage_unit ?? null,
        apply: plan.storageUnit.value,
      },
      optionalString(
        "storage_type",
        "ストレージ種類",
        plan.storageType,
        matched.plan?.storage_type ?? null,
      ),
      optionalString("cpu", "CPU", plan.cpu, matched.plan?.cpu ?? null),
      optionalString("memory", "メモリ", plan.memory, matched.plan?.memory ?? null),
      optionalString(
        "transfer_amount",
        "転送量",
        plan.transferAmount,
        matched.plan?.transfer_amount ?? null,
      ),
      optionalString(
        "min_contract_period",
        "最低契約期間",
        plan.minContractPeriod,
        matched.plan?.min_contract_period ?? null,
      ),
      optionalNumber(
        "free_trial_days",
        "無料お試し期間",
        plan.freeTrialDays,
        matched.plan?.free_trial_days != null
          ? String(matched.plan.free_trial_days)
          : null,
      ),
      optionalString(
        "free_domain_count",
        "無料ドメイン数",
        plan.freeDomainCount,
        matched.plan?.free_domain_count ?? null,
      ),
      optionalString(
        "database_count",
        "データベース数",
        plan.databaseCount,
        matched.plan?.database_count ?? null,
      ),
      optionalString(
        "multi_domain_count",
        "マルチドメイン数",
        plan.multiDomainCount,
        matched.plan?.multi_domain_count ?? null,
      ),
      optionalString(
        "official_url",
        "プランURL",
        plan.officialUrl,
        matched.plan?.official_url ?? null,
      ),
    ].filter((row): row is NonNullable<typeof row> => Boolean(row));

    for (const row of fields) {
      const suggested = displaySuggested(row.field.value, {
        money: "money" in row ? Boolean(row.money) : false,
        unit: "unit" in row ? (row.unit as string | null | undefined) : null,
      });
      const kind = changeKindFor(row.current, suggested, row.field.status);
      const applyValue = row.apply;

      const warningParts: string[] = [];
      if (row.field.warning) warningParts.push(row.field.warning);
      if (isNew) {
        warningParts.push(
          "対応する既存プランがありません（新規プラン候補）。",
        );
      }
      if (matched.kind === "partial") {
        warningParts.push("プラン名の部分一致です。要確認。");
      }

      const selectableBase = canApplyValue({
        status: row.field.status,
        confidence: row.field.confidence,
        changeKind: kind,
        applyValue,
        fieldKey: row.key,
      });

      // 既存プランへは一致時のみ。新規候補は new フォームへ反映可能
      // partial match → selectable but flagged 要確認 (confidence medium)
      const selectable =
        selectableBase &&
        (Boolean(matched.plan) || isNew) &&
        matched.kind !== "partial";

      const fieldKey = isNew
        ? `new_plan:${planKey}:${row.key}`
        : `plan.${row.key}`;

      items.push({
        id: `plan:${planKey}:${row.key}`,
        group: "plan",
        planName,
        planId: matched.plan?.id ?? null,
        planSlugHint: plan.slugHint ?? null,
        planMatchKind: matched.kind,
        isNewPlanCandidate: isNew,
        fieldKey,
        label: isNew ? `【${planName}】${row.label}` : row.label,
        currentValue: row.current,
        suggestedValue: suggested,
        rawValue: row.field.rawValue ?? null,
        sourceUrl: row.field.sourceUrl,
        confidence: row.field.confidence,
        status: row.field.status,
        changeKind: kind,
        warning: warningParts.length > 0 ? warningParts.join(" ") : null,
        inferred: row.field.inferred,
        applyValue,
        selectable,
      });
    }
  });

  for (const scrapedComp of scraped.comparisonValues) {
    const field = comparisonFields.find(
      (f) => f.slug === scrapedComp.fieldSlug,
    );
    const missingField = !field;
    const currentVal = field ? valueMap.get(field.id) ?? null : null;

    let currentForCompare: string | null = null;
    if (field) {
      if (field.field_type === "boolean") {
        currentForCompare =
          currentVal?.boolean_value == null
            ? "未確認"
            : currentVal.boolean_value
              ? "あり"
              : "なし";
      } else if (field.field_type === "number" || field.field_type === "rating") {
        currentForCompare =
          currentVal?.number_value == null
            ? null
            : `${Number(currentVal.number_value).toLocaleString("ja-JP")}${
                field.unit ?? ""
              }`;
      } else {
        const formatted = formatComparisonDisplay(field, currentVal);
        currentForCompare =
          formatted === "-" || formatted === "—" ? null : formatted;
      }
    }

    const suggested = displaySuggested(scrapedComp.value, {
      unit:
        field?.field_type === "number" || field?.field_type === "rating"
          ? field.unit
          : null,
    });

    let finalKind = changeKindFor(
      currentForCompare,
      suggested,
      scrapedComp.status,
    );
    if (
      field?.field_type === "boolean" &&
      scrapedComp.value != null &&
      currentVal?.boolean_value === scrapedComp.value
    ) {
      finalKind = "unchanged";
    }

    const applyValue = scrapedComp.value;
    const warningParts: string[] = [];
    if (scrapedComp.warning) warningParts.push(scrapedComp.warning);
    if (missingField) {
      warningParts.push(
        "対応する比較項目が未登録です。比較項目管理から追加してください。",
      );
    }

    const selectable =
      canApplyValue({
        status: scrapedComp.status,
        confidence: scrapedComp.confidence,
        changeKind: finalKind,
        applyValue,
        fieldKey: scrapedComp.key,
      }) && Boolean(field);

    items.push({
      id: `comparison:${scrapedComp.fieldSlug}`,
      group: "comparison",
      fieldKey: scrapedComp.key,
      label: scrapedComp.label,
      currentValue: currentForCompare,
      suggestedValue: suggested,
      rawValue: scrapedComp.rawValue ?? null,
      sourceUrl: scrapedComp.sourceUrl,
      confidence: scrapedComp.confidence,
      status: scrapedComp.status,
      changeKind: finalKind,
      warning: warningParts.length > 0 ? warningParts.join(" ") : null,
      inferred: scrapedComp.inferred,
      applyValue,
      fieldSlug: scrapedComp.fieldSlug,
      comparisonFieldId: field?.id ?? null,
      isMissingComparisonField: missingField,
      selectable,
    });
  }

  return items;
}

export type PlanDraftPatch = Partial<{
  name: string;
  slug: string;
  regular_monthly_price: string;
  campaign_monthly_price: string;
  effective_monthly_price: string;
  initial_fee: string;
  billing_period: string;
  storage_value: string;
  storage_unit: string;
  storage_type: string;
  cpu: string;
  memory: string;
  transfer_amount: string;
  free_trial_days: string;
  free_domain_count: string;
  database_count: string;
  multi_domain_count: string;
  official_url: string;
  min_contract_period: string;
}>;

export type AppliedScrapeDraft = {
  plans: Record<string, PlanDraftPatch>;
  comparison: Record<string, string>;
  /** 新規プラン候補（プラン追加フォームへ） */
  newPlan?: PlanDraftPatch | null;
};

function planColumnFromFieldKey(fieldKey: string): string {
  if (fieldKey.startsWith("plan.")) return fieldKey.slice(5);
  if (fieldKey.startsWith("new_plan:")) {
    const rest = fieldKey.slice("new_plan:".length);
    const sep = rest.indexOf(":");
    if (sep > 0) return rest.slice(sep + 1);
  }
  return fieldKey;
}

export function buildApplyDraft(
  selected: ScrapeDiffItem[],
): AppliedScrapeDraft {
  const plans: Record<string, PlanDraftPatch> = {};
  const comparison: Record<string, string> = {};
  const newPlanFields: PlanDraftPatch = {};
  let newPlanName: string | null = null;
  let newPlanSlug: string | null = null;

  for (const item of selected) {
    if (item.applyValue == null) continue;

    if (item.group === "plan") {
      const value =
        typeof item.applyValue === "boolean"
          ? item.applyValue
            ? "true"
            : "false"
          : String(item.applyValue);
      const column = planColumnFromFieldKey(item.fieldKey);

      if (item.planId) {
        const patch = plans[item.planId] ?? {};
        (patch as Record<string, string>)[column] = value;
        plans[item.planId] = patch;
      } else if (item.isNewPlanCandidate) {
        (newPlanFields as Record<string, string>)[column] = value;
        newPlanName = item.planName ?? newPlanName;
        newPlanSlug = item.planSlugHint ?? newPlanSlug;
      }
    }

    if (item.group === "comparison" && item.comparisonFieldId) {
      if (typeof item.applyValue === "boolean") {
        comparison[item.comparisonFieldId] = item.applyValue
          ? "true"
          : "false";
      } else {
        comparison[item.comparisonFieldId] = String(item.applyValue);
      }
    }
  }

  const newPlan =
    Object.keys(newPlanFields).length > 0
      ? {
          ...newPlanFields,
          name: newPlanName ?? "",
          slug: newPlanSlug ?? "",
        }
      : null;

  return { plans, comparison, newPlan };
}

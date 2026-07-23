import type { ComparisonField, ComparisonValue, ServicePlan } from "@/lib/types/database";
import { formatStorage } from "@/lib/types/comparison";
import {
  formatSupportMethods,
  formatTrialPeriod,
} from "@/lib/site/compare-formatters";
import {
  readSupportDetail,
  type SupportDetail,
} from "@/lib/site/support";
import type { EnrichedService } from "@/lib/site/service-utils";

/** ランキングカード右側の指標種別 */
export type RankingSecondaryKind =
  | "trial"
  | "wordpress_easy"
  | "capacity"
  | "storage_type"
  | "multi_domain"
  | "support"
  | "none";

export type RankingSecondaryMetric = {
  label: string;
  value: string;
};

/**
 * ランキング（purposeId）ごとの右側表示項目。
 * 月額料金は全ランキング共通で左側に表示する。
 */
export const RANKING_SECONDARY_BY_PURPOSE: Record<
  string,
  { kind: RankingSecondaryKind; label: string }
> = {
  beginner: { kind: "trial", label: "無料お試し期間" },
  blog: { kind: "wordpress_easy", label: "WordPress簡単導入" },
  business: { kind: "capacity", label: "容量" },
  speed: { kind: "storage_type", label: "ストレージ" },
  cheap: { kind: "none", label: "" },
  costperf: { kind: "capacity", label: "容量" },
  wordpress: { kind: "wordpress_easy", label: "WordPress簡単導入" },
  multi: { kind: "multi_domain", label: "マルチドメイン" },
  support: { kind: "support", label: "サポート" },
  storage: { kind: "capacity", label: "容量" },
  /** 総合: 仕様未指定のため容量を表示（従来の副指標） */
  overall: { kind: "capacity", label: "容量" },
};

function formatOx(value: boolean | null | undefined, empty = "—"): string {
  if (value == null) return empty;
  return value ? "○" : "×";
}

function findWordpressEasyField(
  fields: ComparisonField[],
): ComparisonField | undefined {
  return fields.find(
    (f) =>
      f.slug === "wordpress-easy-install" ||
      f.slug === "wp-easy-install" ||
      /wordpress.?easy|wp.?easy|簡単インストール|簡単導入/i.test(
        `${f.slug} ${f.name}`,
      ),
  );
}

function comparisonBool(
  fieldId: string,
  serviceValues: Record<string, ComparisonValue>,
  planValues?: Record<string, ComparisonValue>,
): boolean | null {
  const fromPlan = planValues?.[fieldId];
  if (fromPlan?.boolean_value != null) return fromPlan.boolean_value;
  const fromService = serviceValues[fieldId];
  if (fromService?.boolean_value != null) return fromService.boolean_value;
  return null;
}

export type RankingMetricContext = {
  plan: ServicePlan | null | undefined;
  fields: ComparisonField[];
  comparisonByFieldId: Record<string, ComparisonValue>;
  comparisonByPlanId?: Record<string, ComparisonValue>;
};

/**
 * purposeId に応じた右側指標を、管理画面のプラン／比較項目データから解決する。
 */
export function resolveRankingSecondaryMetric(
  purposeId: string,
  ctx: RankingMetricContext,
): RankingSecondaryMetric | null {
  const config =
    RANKING_SECONDARY_BY_PURPOSE[purposeId] ??
    RANKING_SECONDARY_BY_PURPOSE.overall;
  if (!config || config.kind === "none") return null;

  const { plan, fields, comparisonByFieldId, comparisonByPlanId } = ctx;
  let value = "—";

  switch (config.kind) {
    case "trial": {
      const days =
        plan?.free_trial_days != null && !Number.isNaN(Number(plan.free_trial_days))
          ? Number(plan.free_trial_days)
          : null;
      value = formatTrialPeriod(days, "—");
      break;
    }
    case "wordpress_easy": {
      const field = findWordpressEasyField(fields);
      if (field) {
        value = formatOx(
          comparisonBool(field.id, comparisonByFieldId, comparisonByPlanId),
        );
      }
      break;
    }
    case "capacity": {
      if (plan?.storage_value != null) {
        value = formatStorage(plan.storage_value, plan.storage_unit);
      }
      break;
    }
    case "storage_type": {
      const fromPlan = plan?.storage_type?.trim();
      if (fromPlan) {
        value = fromPlan;
        break;
      }
      const field = fields.find(
        (f) =>
          f.slug === "storage-type" ||
          /ストレージ.?種類|storage.?type/i.test(`${f.slug} ${f.name}`),
      );
      if (field) {
        const v =
          comparisonByPlanId?.[field.id] ?? comparisonByFieldId[field.id];
        const fromText = v?.text_value?.trim();
        if (fromText) value = fromText;
      }
      break;
    }
    case "multi_domain": {
      const fromPlan = plan?.multi_domain_count?.toString().trim();
      if (fromPlan) {
        value = fromPlan;
        break;
      }
      const field = fields.find(
        (f) =>
          /multi[-_]?domain/.test(f.slug) || /マルチドメイン/.test(f.name),
      );
      if (field) {
        const v =
          comparisonByPlanId?.[field.id] ?? comparisonByFieldId[field.id];
        const fromText = v?.text_value?.trim();
        if (fromText) value = fromText;
        else if (
          v?.number_value != null &&
          !Number.isNaN(Number(v.number_value))
        ) {
          value = String(v.number_value);
        }
      }
      break;
    }
    case "support": {
      const mini = {
        comparisonByFieldId,
        representativePlan: plan ?? null,
      } as unknown as EnrichedService;
      const detail: SupportDetail = readSupportDetail(mini, fields);
      value = formatSupportMethods(detail, "—").text;
      break;
    }
    default:
      return null;
  }

  return { label: config.label, value };
}

import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { RANKING_PURPOSE_OPTIONS } from "@/lib/site/content";
import { formatMonthlyPriceLabel } from "@/lib/site/compare-formatters";
import { formatStorage } from "@/lib/types/comparison";
import { formatPlanLabelFromPlan } from "@/lib/site/service-name-display";
import type { EnrichedService } from "@/lib/site/service-utils";
import { isPublicSiteService } from "@/lib/site/public-data";
import { pickRepresentativePlan } from "@/lib/site/plan-utils";
import {
  resolveRankingSecondaryMetric,
  type RankingSecondaryMetric,
} from "@/lib/site/ranking-metrics";
import type {
  ComparisonField,
  ComparisonValue,
  ServicePlan,
} from "@/lib/types/database";

export type ManagedRankingCard = {
  rank: 1 | 2 | 3;
  purposeId: string;
  service: EnrichedService["service"];
  planId: string | null;
  planName: string | null;
  monthlyLabel: string;
  /** @deprecated 互換用。secondaryMetric を優先 */
  storageLabel: string;
  /** ランキング種別ごとの右側指標（月額料金が安い等は null） */
  secondaryMetric: RankingSecondaryMetric | null;
  cardComment: string;
  subComment: string;
  /** 管理画面で設定した★（0〜5） */
  rating: number | null;
  affiliateLinks: EnrichedService["affiliateLinks"];
};

export type ManagedRankingSet = {
  purposeId: string;
  items: ManagedRankingCard[];
  hasHiddenService: boolean;
};

type RankingRow = {
  purpose_id: string;
  rank: number;
  service_id: string | null;
  plan_id: string | null;
  rating: number | null;
  card_comment: string | null;
  sub_comment: string | null;
  is_visible: boolean;
};

const PLAN_SELECT =
  "id, service_id, name, display_name, slug, regular_monthly_price, campaign_monthly_price, effective_monthly_price, initial_fee, storage_value, storage_unit, storage_type, free_trial_days, multi_domain_count, is_published, is_default_comparison_plan, display_order";

/**
 * 公開済みランキングを取得。未設定カテゴリは空配列。
 */
export const loadPublishedRankings = cache(
  async (): Promise<Map<string, ManagedRankingSet>> => {
    const map = new Map<string, ManagedRankingSet>();
    for (const p of RANKING_PURPOSE_OPTIONS) {
      map.set(p.id, {
        purposeId: p.id,
        items: [],
        hasHiddenService: false,
      });
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createPublicClient() as any;
      let { data: rawRows, error } = await supabase
        .from("ranking_entries")
        .select(
          "purpose_id, rank, service_id, plan_id, rating, card_comment, sub_comment, is_visible",
        )
        .eq("is_visible", true)
        .order("rank", { ascending: true });

      // rating カラム未適用時はフォールバック
      if (
        error &&
        (/rating/i.test(error.message) ||
          /column/i.test(error.message) ||
          error.code === "42703")
      ) {
        const fallback = await supabase
          .from("ranking_entries")
          .select(
            "purpose_id, rank, service_id, plan_id, card_comment, sub_comment, is_visible",
          )
          .eq("is_visible", true)
          .order("rank", { ascending: true });
        rawRows = (fallback.data ?? []).map(
          (r: Record<string, unknown>) => ({ ...r, rating: null }),
        );
        error = fallback.error;
      }

      const rows = (rawRows ?? []) as RankingRow[];
      if (error || !rows.length) return map;

      const serviceIds = [
        ...new Set(
          rows
            .map((r) => r.service_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      if (!serviceIds.length) return map;

      const [{ data: services }, plansPrimary, { data: affiliates }] =
        await Promise.all([
          supabase
            .from("services")
            .select(
              "id, category_id, name, slug, short_name, catchphrase, logo_url, thumbnail_url, official_url, primary_link_url, affiliate_url, affiliate_network, affiliate_status, status, is_published, is_site_visible, is_featured, display_order, editor_score, recommended_uses, created_at, updated_at",
            )
            .in("id", serviceIds),
          supabase
            .from("service_plans")
            .select(PLAN_SELECT)
            .in("service_id", serviceIds)
            .eq("is_published", true),
          supabase
            .from("affiliate_links")
            .select(
              "id, service_id, asp_name, program_name, official_url, affiliate_url, approval_status, is_primary, is_active",
            )
            .in("service_id", serviceIds),
        ]);

      let plans = plansPrimary.data as ServicePlan[] | null;
      if (plansPrimary.error) {
        const legacy = await supabase
          .from("service_plans")
          .select(
            "id, service_id, name, display_name, slug, regular_monthly_price, campaign_monthly_price, effective_monthly_price, initial_fee, storage_value, storage_unit, is_published, is_default_comparison_plan, display_order",
          )
          .in("service_id", serviceIds)
          .eq("is_published", true);
        plans = ((legacy.data ?? []) as ServicePlan[]).map((p) => ({
          ...p,
          storage_type: p.storage_type ?? null,
          free_trial_days: p.free_trial_days ?? null,
          multi_domain_count: p.multi_domain_count ?? null,
        }));
      }

      const serviceMap = new Map(
        ((services ?? []) as EnrichedService["service"][]).map((s) => [
          s.id,
          s,
        ]),
      );
      const plansByService = new Map<string, ServicePlan[]>();
      for (const plan of plans ?? []) {
        const list = plansByService.get(plan.service_id) ?? [];
        list.push(plan);
        plansByService.set(plan.service_id, list);
      }
      const affByService = new Map<string, unknown[]>();
      for (const a of (affiliates ?? []) as Array<{ service_id: string }>) {
        const list = affByService.get(a.service_id) ?? [];
        list.push(a);
        affByService.set(a.service_id, list);
      }

      const categoryIds = [
        ...new Set(
          ((services ?? []) as Array<{ category_id: string }>)
            .map((s) => s.category_id)
            .filter(Boolean),
        ),
      ];

      let fields: ComparisonField[] = [];
      const valuesByService = new Map<string, Record<string, ComparisonValue>>();
      const valuesByPlan = new Map<
        string,
        Record<string, Record<string, ComparisonValue>>
      >();

      if (categoryIds.length > 0) {
        const [{ data: fieldRows }, { data: valueRows }] = await Promise.all([
          supabase
            .from("comparison_fields")
            .select(
              "id, category_id, name, slug, field_type, unit, description, display_group, select_options, display_order, is_filterable, is_highlighted, is_published, created_at, updated_at",
            )
            .in("category_id", categoryIds)
            .eq("is_published", true),
          supabase
            .from("comparison_values")
            .select(
              "id, service_id, plan_id, comparison_field_id, boolean_value, number_value, text_value",
            )
            .in("service_id", serviceIds),
        ]);

        fields = (fieldRows ?? []) as ComparisonField[];
        for (const value of (valueRows ?? []) as ComparisonValue[]) {
          if (value.plan_id == null) {
            const m = valuesByService.get(value.service_id) ?? {};
            m[value.comparison_field_id] = value;
            valuesByService.set(value.service_id, m);
            continue;
          }
          const byPlan = valuesByPlan.get(value.service_id) ?? {};
          const planMap = byPlan[value.plan_id] ?? {};
          planMap[value.comparison_field_id] = value;
          byPlan[value.plan_id] = planMap;
          valuesByPlan.set(value.service_id, byPlan);
        }
      }

      for (const row of rows) {
        const set = map.get(row.purpose_id);
        if (!set || !row.service_id) continue;
        const service = serviceMap.get(row.service_id);
        if (!service) continue;

        if (!isPublicSiteService(service)) {
          set.hasHiddenService = true;
          continue;
        }

        const planList = plansByService.get(service.id) ?? [];
        const plan =
          (row.plan_id
            ? planList.find((p) => p.id === row.plan_id)
            : null) ?? pickRepresentativePlan(planList);

        const monthlyLabel = formatMonthlyPriceLabel(plan, "—");
        const storageLabel =
          plan?.storage_value != null
            ? formatStorage(plan.storage_value, plan.storage_unit)
            : "—";

        const categoryFields = fields.filter(
          (f) => f.category_id === service.category_id,
        );
        const secondaryMetric = resolveRankingSecondaryMetric(row.purpose_id, {
          plan,
          fields: categoryFields,
          comparisonByFieldId: valuesByService.get(service.id) ?? {},
          comparisonByPlanId: plan
            ? valuesByPlan.get(service.id)?.[plan.id]
            : undefined,
        });

        set.items.push({
          rank: row.rank as 1 | 2 | 3,
          purposeId: row.purpose_id,
          service,
          planId: plan?.id ?? row.plan_id,
          planName: formatPlanLabelFromPlan(plan),
          monthlyLabel,
          storageLabel,
          secondaryMetric,
          cardComment: row.card_comment?.trim() || "",
          subComment: row.sub_comment?.trim() || "",
          rating:
            row.rating != null && !Number.isNaN(Number(row.rating))
              ? Math.min(5, Math.max(0, Number(row.rating)))
              : null,
          affiliateLinks: (affByService.get(service.id) ?? []) as never,
        });
      }
    } catch {
      // テーブル未適用時は空
    }

    return map;
  },
);

import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { RANKING_PURPOSE_OPTIONS } from "@/lib/site/content";
import { formatMonthlyPriceLabel } from "@/lib/site/compare-formatters";
import { formatStorage } from "@/lib/types/comparison";
import { formatPlanLabelFromPlan } from "@/lib/site/service-name-display";
import type { EnrichedService } from "@/lib/site/service-utils";
import { isPublicSiteService } from "@/lib/site/public-data";
import { pickRepresentativePlan } from "@/lib/site/plan-utils";

export type ManagedRankingCard = {
  rank: 1 | 2 | 3;
  purposeId: string;
  service: EnrichedService["service"];
  planId: string | null;
  planName: string | null;
  monthlyLabel: string;
  storageLabel: string;
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

      const [{ data: services }, { data: plans }, { data: affiliates }] =
        await Promise.all([
          supabase
            .from("services")
            .select(
              "id, category_id, name, slug, short_name, catchphrase, logo_url, thumbnail_url, official_url, primary_link_url, affiliate_url, affiliate_network, affiliate_status, status, is_published, is_site_visible, is_featured, display_order, editor_score, recommended_uses, created_at, updated_at",
            )
            .in("id", serviceIds),
          supabase
            .from("service_plans")
            .select(
              "id, service_id, name, display_name, slug, regular_monthly_price, campaign_monthly_price, effective_monthly_price, initial_fee, storage_value, storage_unit, is_published, is_default_comparison_plan, display_order",
            )
            .in("service_id", serviceIds)
            .eq("is_published", true),
          supabase
            .from("affiliate_links")
            .select(
              "id, service_id, asp_name, program_name, official_url, affiliate_url, approval_status, is_primary, is_active",
            )
            .in("service_id", serviceIds),
        ]);

      const serviceMap = new Map(
        ((services ?? []) as EnrichedService["service"][]).map((s) => [
          s.id,
          s,
        ]),
      );
      const plansByService = new Map<string, unknown[]>();
      for (const plan of (plans ?? []) as Array<{ service_id: string }>) {
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
            ? (planList as Array<{ id: string }>).find(
                (p) => p.id === row.plan_id,
              )
            : null) ?? pickRepresentativePlan(planList as never);

        const monthlyLabel = formatMonthlyPriceLabel(plan as never, "—");
        const storageLabel =
          plan &&
          typeof plan === "object" &&
          "storage_value" in plan &&
          (plan as { storage_value: number | null }).storage_value != null
            ? formatStorage(
                (plan as { storage_value: number }).storage_value,
                (plan as { storage_unit?: string | null }).storage_unit,
              )
            : "—";

        set.items.push({
          rank: row.rank as 1 | 2 | 3,
          purposeId: row.purpose_id,
          service,
          planId:
            plan && typeof plan === "object" && "id" in plan
              ? String((plan as { id: string }).id)
              : row.plan_id,
          planName: formatPlanLabelFromPlan(plan as never),
          monthlyLabel,
          storageLabel,
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

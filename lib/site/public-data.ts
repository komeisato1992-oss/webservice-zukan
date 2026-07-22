import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  AffiliateLink,
  Category,
  ComparisonField,
  ComparisonValue,
  Service,
  ServicePlan,
} from "@/lib/types/database";
import { PRIMARY_CATEGORY_SLUG } from "@/lib/site/brand";
import {
  PUBLIC_DATA_REVALIDATE_SECONDS,
  PUBLIC_SITE_CACHE_TAG,
} from "@/lib/site/cache";
import type { PublicCampaign } from "@/lib/site/compare-formatters";
import {
  pickHighlightLabels,
  type EnrichedService,
  type ServiceWithRelations,
} from "@/lib/site/service-utils";
import { sortByEditorScore } from "@/lib/site/compare-rows";
import { pickRepresentativePlan } from "@/lib/site/plan-utils";
import {
  resolveFeaturedComparisonServices,
  resolveTopComparisonServices,
} from "@/lib/site/top-placement";

export type { EnrichedService, ServiceWithRelations } from "@/lib/site/service-utils";
export {
  filterServicesByPurpose,
  getPurposeById,
  matchPurpose,
  pickComparisonColumns,
  pickHighlightLabels,
} from "@/lib/site/service-utils";

export type ServerTopData = {
  category: Category;
  services: EnrichedService[];
  allCount: number;
  comparisonFields: ComparisonField[];
  recommended: EnrichedService[];
  recommendedMode: "featured" | "注目";
  tableServices: EnrichedService[];
  /** 総合評価（editor_score）上位。未設定時は featured / display_order で補完 */
  topRatedServices: EnrichedService[];
  /** TOP hero「人気3社の比較」初期表示（管理画面設定 or フォールバック） */
  featuredComparisonServices: EnrichedService[];
  /** TOP本文「レンタルサーバーを比較」初期表示（管理画面設定 or フォールバック） */
  topComparisonServices: EnrichedService[];
};

const CATEGORY_PUBLIC_COLUMNS =
  "id, name, slug, description, icon, display_order, is_published, seo_title, seo_description, created_at, updated_at";

/** TOP/比較用。長文 description / SEO 本文は一覧では載せない */
const SERVICE_PUBLIC_COLUMNS =
  "id, category_id, name, slug, short_name, catchphrase, summary, logo_url, thumbnail_url, official_url, primary_link_url, affiliate_url, affiliate_network, affiliate_status, status, is_published, is_site_visible, is_featured, display_order, editor_score, show_in_top_featured_comparison, show_in_top_comparison, top_featured_display_order, top_comparison_display_order, recommended_uses, created_at, updated_at";

/**
 * マイグレーション未適用時でも本サイトから隠す初期スラッグ
 * （DB の is_site_visible=false と同一。カラム適用後は DB 値を優先）
 */
export const DEFAULT_SITE_HIDDEN_SLUGS = new Set([
  "webarena-indigo",
  "heteml",
  "futoka",
  "zenlogic",
]);

/** 本サイト公開対象（公開中かつサイト表示ON） */
export function isPublicSiteService(service: {
  is_published?: boolean | null;
  is_site_visible?: boolean | null;
  slug?: string | null;
}): boolean {
  if (!service.is_published) return false;
  if (service.is_site_visible === false) return false;
  // カラム未適用（値が来ない）ときは初期非表示スラッグをフォールバック
  if (
    service.is_site_visible == null &&
    service.slug &&
    DEFAULT_SITE_HIDDEN_SLUGS.has(service.slug)
  ) {
    return false;
  }
  return true;
}

const PLAN_PUBLIC_COLUMNS =
  "id, service_id, name, slug, regular_monthly_price, campaign_monthly_price, effective_monthly_price, initial_fee, billing_period, storage_value, storage_unit, storage_type, free_trial_days, description, display_order, is_published, is_default_comparison_plan, is_recommended, official_url, created_at, updated_at";

const CAMPAIGN_PUBLIC_COLUMNS =
  "id, service_id, name, summary, target_plan_ids, discount_rate, discount_amount, ends_on, is_published, display_order";

const FIELD_PUBLIC_COLUMNS =
  "id, category_id, name, slug, field_type, unit, description, display_group, select_options, display_order, is_filterable, is_highlighted, is_published, value_source, compare_rule, show_in_top_featured, top_featured_display_order, show_in_top_table, top_table_display_order, show_in_compare_page, compare_page_display_order, created_at, updated_at";

const VALUE_PUBLIC_COLUMNS =
  "id, service_id, plan_id, comparison_field_id, boolean_value, number_value, text_value";

const AFFILIATE_PUBLIC_COLUMNS =
  "id, service_id, asp_name, program_name, official_url, affiliate_url, approval_status, is_primary, is_active";

async function fetchPublishedCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("categories")
    .select(CATEGORY_PUBLIC_COLUMNS)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return data;
}

async function fetchServerTopData(
  categorySlug: string,
): Promise<ServerTopData | null> {
  try {
    return await fetchServerTopDataInner(categorySlug);
  } catch (error) {
    console.error("[server-top] fetchServerTopData failed", {
      categorySlug,
      message: error instanceof Error ? error.message : String(error),
      details:
        error && typeof error === "object" && "message" in error
          ? {
              message: String((error as { message?: unknown }).message),
              code: (error as { code?: unknown }).code,
              details: (error as { details?: unknown }).details,
              hint: (error as { hint?: unknown }).hint,
            }
          : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

async function fetchServerTopDataInner(
  categorySlug: string,
): Promise<ServerTopData | null> {
  const supabase = createPublicClient();

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select(CATEGORY_PUBLIC_COLUMNS)
    .eq("slug", categorySlug)
    .eq("is_published", true)
    .maybeSingle();

  if (categoryError) throw categoryError;
  if (!category) {
    console.error("[server-top] category not found or unpublished", {
      categorySlug,
    });
    return null;
  }

  let serviceRows: ServiceWithRelations[] | null = null;
  {
    const primary = await supabase
      .from("services")
      .select(
        `${SERVICE_PUBLIC_COLUMNS}, affiliate_links(${AFFILIATE_PUBLIC_COLUMNS})`,
      )
      .eq("category_id", category.id)
      .eq("is_published", true)
      .eq("is_site_visible", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (primary.error) {
      // is_site_visible 未適用時フォールバック
      const withoutVisible = await supabase
        .from("services")
        .select(
          `id, category_id, name, slug, short_name, catchphrase, summary, logo_url, thumbnail_url, official_url, primary_link_url, affiliate_url, affiliate_network, affiliate_status, status, is_published, is_featured, display_order, editor_score, show_in_top_featured_comparison, show_in_top_comparison, top_featured_display_order, top_comparison_display_order, recommended_uses, created_at, updated_at, affiliate_links(${AFFILIATE_PUBLIC_COLUMNS})`,
        )
        .eq("category_id", category.id)
        .eq("is_published", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (withoutVisible.error) {
        const legacy = await supabase
          .from("services")
          .select(
            `id, category_id, name, slug, short_name, catchphrase, summary, description, logo_url, thumbnail_url, official_url, primary_link_url, status, is_published, is_featured, display_order, editor_score, recommended_uses, seo_title, seo_description, created_at, updated_at, affiliate_links(${AFFILIATE_PUBLIC_COLUMNS})`,
          )
          .eq("category_id", category.id)
          .eq("is_published", true)
          .order("display_order", { ascending: true })
          .order("name", { ascending: true });
        if (legacy.error) throw primary.error;
        serviceRows = (legacy.data ?? []) as ServiceWithRelations[];
      } else {
        serviceRows = (withoutVisible.data ?? []) as ServiceWithRelations[];
      }
    } else {
      serviceRows = (primary.data ?? []) as ServiceWithRelations[];
    }
  }

  const servicesRaw = (serviceRows ?? []).filter((s) =>
    isPublicSiteService(s as Service),
  );
  const serviceIds = servicesRaw.map((s) => s.id);

  const [plansPrimary, fieldsRes, valuesRes, campaignsRes] = await Promise.all([
    serviceIds.length
      ? supabase
          .from("service_plans")
          .select(PLAN_PUBLIC_COLUMNS)
          .in("service_id", serviceIds)
          .eq("is_published", true)
          .order("display_order", { ascending: true })
      : Promise.resolve({ data: [] as ServicePlan[], error: null }),
    supabase
      .from("comparison_fields")
      .select(FIELD_PUBLIC_COLUMNS)
      .eq("category_id", category.id)
      .eq("is_published", true)
      .order("display_order", { ascending: true }),
    serviceIds.length
      ? supabase
          .from("comparison_values")
          .select(VALUE_PUBLIC_COLUMNS)
          .in("service_id", serviceIds)
      : Promise.resolve({ data: [] as ComparisonValue[], error: null }),
    serviceIds.length
      ? supabase
          .from("service_campaigns")
          .select(CAMPAIGN_PUBLIC_COLUMNS)
          .in("service_id", serviceIds)
          .eq("is_published", true)
          .order("display_order", { ascending: true })
      : Promise.resolve({ data: [] as PublicCampaign[], error: null }),
  ]);

  let plansRes = plansPrimary;
  if (plansPrimary.error) {
    // マイグレーション前フォールバック（代表プラン列未適用でも公開ページを落とさない）
    console.warn(
      "[server-top] service_plans new columns unavailable, using legacy select:",
      plansPrimary.error.message,
    );
    const withTrial = serviceIds.length
      ? await supabase
          .from("service_plans")
          .select(
            "id, service_id, name, slug, regular_monthly_price, campaign_monthly_price, effective_monthly_price, initial_fee, billing_period, storage_value, storage_unit, storage_type, free_trial_days, description, display_order, is_published, is_default_comparison_plan, is_recommended, official_url, created_at, updated_at",
          )
          .in("service_id", serviceIds)
          .eq("is_published", true)
          .order("display_order", { ascending: true })
      : { data: [] as ServicePlan[], error: null };

    if (!withTrial.error) {
      plansRes = withTrial;
    } else {
      const legacy = serviceIds.length
        ? await supabase
            .from("service_plans")
            .select(
              "id, service_id, name, slug, regular_monthly_price, campaign_monthly_price, effective_monthly_price, initial_fee, billing_period, storage_value, storage_unit, description, display_order, is_published, created_at, updated_at",
            )
            .in("service_id", serviceIds)
            .eq("is_published", true)
            .order("display_order", { ascending: true })
        : { data: [] as ServicePlan[], error: null };
      if (legacy.error) throw plansPrimary.error;
      // legacy select omits newer columns; enrich for ServicePlan typing
      plansRes = {
        ...legacy,
        data: (legacy.data ?? []).map((p) => ({
          ...p,
          is_default_comparison_plan:
            (p as ServicePlan).is_default_comparison_plan ?? false,
          is_recommended: (p as ServicePlan).is_recommended ?? false,
          official_url: (p as ServicePlan).official_url ?? null,
          storage_type: (p as ServicePlan).storage_type ?? null,
          free_trial_days: (p as ServicePlan).free_trial_days ?? null,
        })),
      };
    }
  }

  if (campaignsRes.error) {
    console.warn(
      "[server-top] service_campaigns unavailable:",
      campaignsRes.error.message,
    );
  }

  if (valuesRes.error) throw valuesRes.error;

  let fields = fieldsRes.data as ComparisonField[] | null;
  if (fieldsRes.error) {
    // マイグレーション前フォールバック（新カラム未適用でも公開ページを落とさない）
    const legacy = await supabase
      .from("comparison_fields")
      .select(
        "id, category_id, name, slug, field_type, unit, description, display_group, select_options, display_order, is_filterable, is_highlighted, is_published, created_at, updated_at",
      )
      .eq("category_id", category.id)
      .eq("is_published", true)
      .order("display_order", { ascending: true });
    if (legacy.error) throw fieldsRes.error;
    fields = legacy.data as ComparisonField[];
  }

  const plans = plansRes.data;
  const values = valuesRes.data;
  const campaigns = (campaignsRes.error
    ? []
    : ((campaignsRes.data ?? []) as PublicCampaign[]));

  const comparisonFields = ((fields ?? []) as ComparisonField[]).map((f) => ({
    ...f,
    value_source: f.value_source ?? "comparison_value",
    compare_rule: f.compare_rule ?? null,
    show_in_top_featured: Boolean(f.show_in_top_featured),
    top_featured_display_order: f.top_featured_display_order ?? null,
    show_in_top_table: Boolean(f.show_in_top_table),
    top_table_display_order: f.top_table_display_order ?? null,
    show_in_compare_page: f.show_in_compare_page !== false,
    compare_page_display_order: f.compare_page_display_order ?? null,
  }));
  const plansByService = new Map<string, ServicePlan[]>();
  for (const raw of (plans ?? []) as ServicePlan[]) {
    const plan: ServicePlan = {
      ...raw,
      is_default_comparison_plan: Boolean(raw.is_default_comparison_plan),
      is_recommended: Boolean(raw.is_recommended),
      official_url: raw.official_url ?? null,
      storage_type: raw.storage_type ?? null,
      free_trial_days:
        raw.free_trial_days != null ? Number(raw.free_trial_days) : null,
    };
    const list = plansByService.get(plan.service_id) ?? [];
    list.push(plan);
    plansByService.set(plan.service_id, list);
  }

  const campaignsByService = new Map<string, PublicCampaign[]>();
  for (const campaign of campaigns) {
    const list = campaignsByService.get(campaign.service_id) ?? [];
    list.push({
      ...campaign,
      target_plan_ids: campaign.target_plan_ids ?? [],
      summary: campaign.summary ?? null,
      discount_rate: campaign.discount_rate ?? null,
      discount_amount: campaign.discount_amount ?? null,
      ends_on: campaign.ends_on ?? null,
      is_published: Boolean(campaign.is_published),
      display_order: campaign.display_order ?? 0,
    });
    campaignsByService.set(campaign.service_id, list);
  }

  const valuesByService = new Map<string, Record<string, ComparisonValue>>();
  const valuesByPlan = new Map<
    string,
    Record<string, Record<string, ComparisonValue>>
  >();

  for (const value of (values ?? []) as ComparisonValue[]) {
    if (value.plan_id == null) {
      const map = valuesByService.get(value.service_id) ?? {};
      map[value.comparison_field_id] = value;
      valuesByService.set(value.service_id, map);
      continue;
    }
    const byPlan = valuesByPlan.get(value.service_id) ?? {};
    const planMap = byPlan[value.plan_id] ?? {};
    planMap[value.comparison_field_id] = value;
    byPlan[value.plan_id] = planMap;
    valuesByPlan.set(value.service_id, byPlan);
  }

  const services: EnrichedService[] = servicesRaw.map((row) => {
    const { affiliate_links, ...service } = row;
    const comparisonByFieldId = valuesByService.get(service.id) ?? {};
    const comparisonByPlanId = valuesByPlan.get(service.id) ?? {};
    const planList = plansByService.get(service.id) ?? [];
    const normalized: Service = {
      ...(service as Service),
      show_in_top_featured_comparison: Boolean(
        (service as Service).show_in_top_featured_comparison,
      ),
      show_in_top_comparison: Boolean(
        (service as Service).show_in_top_comparison,
      ),
      top_featured_display_order:
        (service as Service).top_featured_display_order ?? null,
      top_comparison_display_order:
        (service as Service).top_comparison_display_order ?? null,
    };
    return {
      service: normalized,
      affiliateLinks: (affiliate_links as AffiliateLink[]) ?? [],
      plans: planList,
      representativePlan: pickRepresentativePlan(planList),
      comparisonByFieldId,
      comparisonByPlanId,
      campaigns: campaignsByService.get(service.id) ?? [],
      highlightLabels: pickHighlightLabels(comparisonFields, comparisonByFieldId),
    };
  });

  const featured = services.filter((s) => s.service.is_featured);
  const recommendedMode: "featured" | "注目" =
    featured.length > 0 ? "featured" : "注目";
  const recommended =
    featured.length > 0 ? featured.slice(0, 3) : services.slice(0, 3);

  const tablePool = [
    ...services.filter((s) => s.service.is_featured),
    ...services.filter((s) => !s.service.is_featured),
  ];
  const seen = new Set<string>();
  const tableServices: EnrichedService[] = [];
  for (const item of tablePool) {
    if (seen.has(item.service.id)) continue;
    seen.add(item.service.id);
    tableServices.push(item);
    if (tableServices.length >= 8) break;
  }

  const topRatedServices = sortByEditorScore(services).slice(0, 5);
  const featuredComparisonServices = resolveFeaturedComparisonServices(services);
  const topComparisonServices = resolveTopComparisonServices(services);

  return {
    category,
    services,
    allCount: services.length,
    comparisonFields,
    recommended,
    recommendedMode,
    tableServices,
    topRatedServices,
    featuredComparisonServices,
    topComparisonServices,
  };
}

const getCachedPublishedCategoryBySlug = unstable_cache(
  fetchPublishedCategoryBySlug,
  ["published-category-by-slug"],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_SITE_CACHE_TAG],
  },
);

const getCachedServerTopData = unstable_cache(
  fetchServerTopData,
  ["server-top-data"],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_SITE_CACHE_TAG],
  },
);

/** リクエスト内 dedupe + クロスリクエストキャッシュ（300秒 / タグ無効化） */
export const getPublishedCategoryBySlug = cache(
  async (slug: string): Promise<Category | null> => {
    return getCachedPublishedCategoryBySlug(slug);
  },
);

/** リクエスト内 dedupe + クロスリクエストキャッシュ（300秒 / タグ無効化） */
export const loadServerTopData = cache(
  async (
    categorySlug: string = PRIMARY_CATEGORY_SLUG,
  ): Promise<ServerTopData | null> => {
    return getCachedServerTopData(categorySlug);
  },
);

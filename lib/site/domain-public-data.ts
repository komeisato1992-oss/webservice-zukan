import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { createPublicClient } from "@/lib/supabase/public";
import { getSupabasePublicEnv } from "@/lib/env";
import type {
  AffiliateLink,
  Category,
  DomainComparisonItem,
  DomainServiceDetails,
  Service,
} from "@/lib/types/database";
import {
  PUBLIC_DATA_REVALIDATE_SECONDS,
  PUBLIC_SITE_CACHE_TAG,
} from "@/lib/site/cache";
import { DOMAIN_CATEGORY_SLUG } from "@/lib/site/domain-brand";
import {
  mergeDomainComparisonItems,
  type DomainCompareItemView,
} from "@/lib/site/domain-compare";
import {
  isPublicSiteService,
  type EnrichedService,
  type ServiceWithRelations,
} from "@/lib/site/public-data";
import { pickRepresentativePlan } from "@/lib/site/plan-utils";

export type DomainTopData = {
  category: Category;
  services: EnrichedService[];
  allCount: number;
  fetchedCount?: number;
  /** 管理画面の比較項目設定（表示ON/OFF・順・最安強調） */
  comparisonItems: DomainCompareItemView[];
  /** service_id → domain_service_details */
  detailsByServiceId: Record<string, DomainServiceDetails>;
};

const CATEGORY_COLUMNS =
  "id, name, slug, description, icon, display_order, is_published, seo_title, seo_description, created_at, updated_at";

const SERVICE_COLUMNS =
  "id, category_id, dictionary_id, name, slug, short_name, catchphrase, logo_url, thumbnail_url, official_url, primary_link_url, affiliate_url, affiliate_network, affiliate_status, status, is_published, is_site_visible, is_featured, display_order, editor_score, recommended_uses, created_at, updated_at";

const AFFILIATE_COLUMNS =
  "id, service_id, asp_name, program_name, official_url, affiliate_url, approval_status, is_primary, is_active";

const FALLBACK_DOMAIN_CATEGORY: Category = {
  id: "fallback-domain-category",
  name: "ドメイン",
  slug: DOMAIN_CATEGORY_SLUG,
  description: "ドメイン取得・管理サービス",
  icon: null,
  display_order: 2,
  is_published: false,
  seo_title: null,
  seo_description: null,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

function createServiceRoleClient() {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * ドメイン図鑑サービス取得:
 * - dictionaries.slug = 'domain' の dictionary_id で絞る（slug 衝突防止）
 * - is_published = true
 * - is_site_visible != false
 * - LIMIT なし
 */
async function fetchDomainTopData(
  categorySlug: string = DOMAIN_CATEGORY_SLUG,
): Promise<DomainTopData> {
  const supabase = createPublicClient();
  const admin = createServiceRoleClient();

  // 1) dictionary_id 解決（domain は is_public=false のことがあるため service role 優先）
  let dictionaryId: string | null = null;
  {
    const client = admin ?? supabase;
    const { data: dict, error } = await client
      .from("dictionaries")
      .select("id")
      .eq("slug", DOMAIN_CATEGORY_SLUG)
      .maybeSingle();
    if (error) {
      console.error("[domain-top] dictionary lookup failed", error.message);
    }
    dictionaryId = dict?.id ?? null;
  }

  // 2) category（未公開時は public RLS で読めない → admin or fallback）
  let category: Category = FALLBACK_DOMAIN_CATEGORY;
  {
    const { data: categoryRow, error } = await supabase
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .eq("slug", categorySlug)
      .maybeSingle();
    if (error) {
      console.error("[domain-top] category query failed", error.message);
    }
    if (categoryRow) {
      category = categoryRow as Category;
    } else if (admin) {
      const { data: adminCategory } = await admin
        .from("categories")
        .select(CATEGORY_COLUMNS)
        .eq("slug", categorySlug)
        .maybeSingle();
      if (adminCategory) category = adminCategory as Category;
    }
  }

  if (!dictionaryId) {
    console.error("[domain-top] dictionary_id not found for slug=domain");
    return {
      category,
      services: [],
      allCount: 0,
      fetchedCount: 0,
      comparisonItems: mergeDomainComparisonItems([]),
      detailsByServiceId: {},
    };
  }

  // 3) services: dictionary_id 必須。公開＋本サイト表示のみ。件数制限なし。
  const selectWithAffiliates = `${SERVICE_COLUMNS}, affiliate_links(${AFFILIATE_COLUMNS})`;
  let serviceRows: ServiceWithRelations[] = [];

  const primary = await supabase
    .from("services")
    .select(selectWithAffiliates)
    .eq("dictionary_id", dictionaryId)
    .eq("is_published", true)
    .eq("is_site_visible", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (primary.error) {
    const fallback = await supabase
      .from("services")
      .select(selectWithAffiliates)
      .eq("dictionary_id", dictionaryId)
      .eq("is_published", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });
    if (fallback.error) {
      console.error("[domain-top] services query failed", primary.error.message);
      serviceRows = [];
    } else {
      serviceRows = (fallback.data ?? []) as ServiceWithRelations[];
    }
  } else {
    serviceRows = (primary.data ?? []) as ServiceWithRelations[];
  }

  const fetchedCount = serviceRows.length;
  const servicesRaw = serviceRows.filter((s) =>
    isPublicSiteService(s as Service),
  );

  const services: EnrichedService[] = servicesRaw.map((row) => {
    const { affiliate_links, ...service } = row;
    return {
      service: service as Service,
      affiliateLinks: (affiliate_links as AffiliateLink[]) ?? [],
      plans: [],
      representativePlan: pickRepresentativePlan([]),
      comparisonByFieldId: {},
      comparisonByPlanId: {},
      campaigns: [],
      highlightLabels: [],
    };
  });

  // 4) 比較項目設定（admin-only RLS → service role）
  let comparisonRows: DomainComparisonItem[] = [];
  {
    const client = admin ?? supabase;
    const { data, error } = await client
      .from("domain_comparison_items")
      .select(
        "id, dictionary_id, group_key, item_key, display_name, is_visible, sort_order, highlight_best, created_at, updated_at",
      )
      .eq("dictionary_id", dictionaryId)
      .order("sort_order", { ascending: true });
    if (error) {
      console.error(
        "[domain-top] domain_comparison_items query failed",
        error.message,
      );
    } else {
      comparisonRows = (data ?? []) as DomainComparisonItem[];
    }
  }

  // 5) domain_service_details（公開サービスのみ RLS で読める）
  const detailsByServiceId: Record<string, DomainServiceDetails> = {};
  const serviceIds = services.map((s) => s.service.id);
  if (serviceIds.length > 0) {
    const { data: detailRows, error } = await supabase
      .from("domain_service_details")
      .select("*")
      .in("service_id", serviceIds);
    if (error) {
      console.error(
        "[domain-top] domain_service_details query failed",
        error.message,
      );
    } else {
      for (const row of (detailRows ?? []) as DomainServiceDetails[]) {
        detailsByServiceId[row.service_id] = row;
      }
    }
  }

  return {
    category,
    services,
    allCount: services.length,
    fetchedCount,
    comparisonItems: mergeDomainComparisonItems(comparisonRows),
    detailsByServiceId,
  };
}

const getCachedDomainTopData = unstable_cache(
  fetchDomainTopData,
  ["domain-top-data-v6-catchphrase"],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_SITE_CACHE_TAG],
  },
);

export const loadDomainTopData = cache(
  async (
    categorySlug: string = DOMAIN_CATEGORY_SLUG,
  ): Promise<DomainTopData> => {
    return getCachedDomainTopData(categorySlug);
  },
);

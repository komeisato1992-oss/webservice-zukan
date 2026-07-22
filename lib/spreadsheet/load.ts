import { createClient } from "@/lib/supabase/server";
import {
  COMPARISON_ITEM_FIELDS,
  COMPARISON_LAYOUT_FIELDS,
  PLAN_FIELDS,
  RANKING_FIELDS,
  SCHEMA_VERSION,
  SERVICE_FIELDS,
  SYNC_INFO_HEADERS,
  type SheetFieldDef,
} from "@/lib/spreadsheet/fields";
import { RANKING_PURPOSE_OPTIONS } from "@/lib/site/content";
import { ensureRankingDraft } from "@/lib/cms/rankings";
import type { CellValue } from "@/lib/spreadsheet/cells";
import { SUPPORT_SHEET_FIELDS } from "@/lib/site/support";
import type {
  AffiliateLink,
  ComparisonField,
  ComparisonValue,
  Service,
  ServicePlan,
} from "@/lib/types/database";
import {
  AFFILIATE_STATUS_LABELS,
  normalizeAffiliateNetwork,
  normalizeAffiliateStatus,
  type AffiliateStatus,
} from "@/lib/site/affiliate";

export type SheetRow = Record<string, CellValue>;

export type ExportBundle = {
  serviceRows: SheetRow[];
  planRows: SheetRow[];
  comparisonItemRows: SheetRow[];
  comparisonLayoutRows: SheetRow[];
  campaignRows: SheetRow[];
  scrapingCandidateRows: SheetRow[];
  rankingRows: SheetRow[];
  syncInfoRows: SheetRow[];
  serviceHeaders: string[];
  planHeaders: string[];
  comparisonItemHeaders: string[];
  comparisonLayoutHeaders: string[];
  campaignHeaders: string[];
  scrapingCandidateHeaders: string[];
  rankingHeaders: string[];
  syncInfoHeaders: string[];
  services: Array<Service & { affiliate_links?: AffiliateLink[] }>;
  plans: ServicePlan[];
  comparisonFields: ComparisonField[];
  counts: {
    services: number;
    plans: number;
    comparisonItems: number;
    campaigns: number;
    comparisonLayout: number;
    scrapingCandidates: number;
    rankings: number;
  };
};

function primaryAffiliate(
  links: AffiliateLink[] | undefined,
): AffiliateLink | null {
  if (!links?.length) return null;
  return (
    links.find((l) => l.is_primary && l.is_active) ??
    links.find((l) => l.is_primary) ??
    links.find((l) => l.is_active) ??
    links[0] ??
    null
  );
}

type SupportValueMap = Map<string, ComparisonValue>; // `${serviceId}::${fieldSlug}`

function readServiceField(
  field: SheetFieldDef,
  service: Service,
  _affiliate: AffiliateLink | null,
  supportValues: SupportValueMap,
  fieldsBySlug: Map<string, ComparisonField>,
): CellValue {
  const t = field.target;
  if (t.table === "meta") {
    if (t.column === "service_id") return service.id;
    if (t.column === "updated_at") return service.updated_at;
  }
  if (t.table === "services") {
    const v = (service as Record<string, unknown>)[t.column];
    if (t.column === "affiliate_network") {
      return normalizeAffiliateNetwork(
        v == null ? null : String(v),
      );
    }
    if (t.column === "affiliate_status") {
      const status = normalizeAffiliateStatus(
        v == null ? null : String(v),
      ) as AffiliateStatus;
      return AFFILIATE_STATUS_LABELS[status];
    }
    return (v as CellValue) ?? null;
  }
  if (t.table === "comparison_values") {
    const cf = fieldsBySlug.get(t.fieldSlug);
    if (!cf) return null;
    const value = supportValues.get(`${service.id}::${t.fieldSlug}`);
    if (!value) return null;
    if (t.valueKind === "boolean") {
      return value.boolean_value;
    }
    return value.text_value?.trim() || null;
  }
  return null;
}

function readPlanField(
  field: SheetFieldDef,
  plan: ServicePlan,
  service: Service | undefined,
): CellValue {
  const t = field.target;
  if (t.table === "meta") {
    if (t.column === "plan_id") return plan.id;
    if (t.column === "service_id") return plan.service_id;
    if (t.column === "service_slug") return service?.slug ?? null;
    if (t.column === "service_name") return service?.name ?? null;
    if (t.column === "updated_at") return plan.updated_at;
  }
  if (t.table === "service_plans") {
    const v = (plan as Record<string, unknown>)[t.column];
    return (v as CellValue) ?? null;
  }
  return null;
}

function readComparisonField(
  field: SheetFieldDef,
  cf: ComparisonField,
): CellValue {
  const t = field.target;
  if (t.table === "meta") {
    if (t.column === "comparison_item_id") return cf.id;
  }
  if (t.table === "comparison_fields") {
    const v = (cf as Record<string, unknown>)[t.column];
    return (v as CellValue) ?? null;
  }
  return null;
}

export async function loadSpreadsheetExportData(
  exportedBy?: string | null,
): Promise<ExportBundle> {
  const supabase = await createClient();

  const { data: services, error } = await supabase
    .from("services")
    .select("*, affiliate_links(*)")
    .order("display_order", { ascending: true });

  if (error) throw error;

  const serviceList = (services ?? []) as Array<
    Service & { affiliate_links?: AffiliateLink[] }
  >;
  const ids = serviceList.map((s) => s.id);
  const byId = new Map(serviceList.map((s) => [s.id, s]));

  const [{ data: plans }, { data: fields }] = await Promise.all([
    ids.length
      ? supabase
          .from("service_plans")
          .select("*")
          .in("service_id", ids)
          .order("display_order", { ascending: true })
      : Promise.resolve({ data: [] as ServicePlan[] }),
    supabase
      .from("comparison_fields")
      .select("*")
      .order("display_order", { ascending: true }),
  ]);

  const planList = (plans ?? []) as ServicePlan[];
  const comparisonFields = (fields ?? []) as ComparisonField[];
  const fieldsBySlug = new Map(comparisonFields.map((f) => [f.slug, f]));

  const supportSlugs = SUPPORT_SHEET_FIELDS.map((f) => f.slug);
  const supportFieldIds = comparisonFields
    .filter((f) => supportSlugs.includes(f.slug))
    .map((f) => f.id);

  const supportValues: SupportValueMap = new Map();
  if (ids.length > 0 && supportFieldIds.length > 0) {
    const { data: values } = await supabase
      .from("comparison_values")
      .select(
        "id, service_id, plan_id, comparison_field_id, boolean_value, number_value, text_value",
      )
      .in("service_id", ids)
      .in("comparison_field_id", supportFieldIds)
      .is("plan_id", null);

    const idToSlug = new Map(
      comparisonFields.map((f) => [f.id, f.slug] as const),
    );
    for (const v of (values ?? []) as ComparisonValue[]) {
      const slug = idToSlug.get(v.comparison_field_id);
      if (!slug) continue;
      supportValues.set(`${v.service_id}::${slug}`, v);
    }
  }

  const serviceRows: SheetRow[] = serviceList.map((service) => {
    const affiliate = primaryAffiliate(service.affiliate_links);
    const row: SheetRow = {};
    for (const field of SERVICE_FIELDS) {
      row[field.key] = readServiceField(
        field,
        service,
        affiliate,
        supportValues,
        fieldsBySlug,
      );
    }
    return row;
  });

  const planRows: SheetRow[] = planList.map((plan) => {
    const service = byId.get(plan.service_id);
    const row: SheetRow = {};
    for (const field of PLAN_FIELDS) {
      row[field.key] = readPlanField(field, plan, service);
    }
    return row;
  });

  const comparisonItemRows: SheetRow[] = comparisonFields.map((cf) => {
    const row: SheetRow = {};
    for (const field of COMPARISON_ITEM_FIELDS) {
      row[field.key] = readComparisonField(field, cf);
    }
    return row;
  });

  const comparisonLayoutRows: SheetRow[] = comparisonFields.map((cf) => {
    const row: SheetRow = {};
    for (const field of COMPARISON_LAYOUT_FIELDS) {
      if (field.target.table === "comparison_fields") {
        row[field.key] = readComparisonField(field, cf);
      } else if (field.key === "comparison_item_id") {
        row[field.key] = cf.id;
      } else {
        row[field.key] = "";
      }
    }
    return row;
  });

  const campaignsRes = await supabase
    .from("service_campaigns")
    .select(
      "id, service_id, name, summary, discount_rate, discount_amount, coupon_code, first_month_free, ends_on, source_url, is_published",
    )
    .order("display_order", { ascending: true });
  const campaigns = campaignsRes.error ? [] : (campaignsRes.data ?? []);

  const campaignRows: SheetRow[] = campaigns.map((c) => ({
    campaign_id: c.id,
    service_id: c.service_id,
    キャンペーン名: c.name,
    概要: c.summary,
    割引率: c.discount_rate,
    割引額: c.discount_amount,
    クーポン: c.coupon_code,
    初月無料: c.first_month_free,
    終了日: c.ends_on,
    出典URL: c.source_url,
    公開状態: c.is_published,
  }));

  const candidatesRes = await supabase
    .from("scraping_candidates")
    .select(
      "id, service_id, field_key, current_published_value, candidate_value, confidence, source_url, fetched_at, status",
    )
    .eq("status", "pending")
    .order("fetched_at", { ascending: false })
    .limit(500);

  const scrapingCandidateRows: SheetRow[] = (
    candidatesRes.error ? [] : (candidatesRes.data ?? [])
  ).map((c) => ({
    candidate_id: c.id,
    service_id: c.service_id,
    項目キー: c.field_key,
    現在値:
      c.current_published_value == null
        ? null
        : JSON.stringify(c.current_published_value),
    候補値:
      c.candidate_value == null ? null : JSON.stringify(c.candidate_value),
    信頼度: c.confidence,
    取得元: c.source_url,
    取得日時: c.fetched_at,
    公開状態: c.status,
  }));

  const { draft: rankingDraft } = await ensureRankingDraft(supabase as never);
  const planById = new Map(planList.map((p) => [p.id, p]));
  const rankingRows: SheetRow[] = (rankingDraft?.payload.entries ?? []).map(
    (e: {
      purpose_id: string;
      rank: number;
      service_id: string | null;
      plan_id: string | null;
      rating: number | null;
      card_comment: string;
      sub_comment: string;
      is_visible: boolean;
    }) => {
      const purpose = RANKING_PURPOSE_OPTIONS.find((p) => p.id === e.purpose_id);
      const service = byId.get(e.service_id ?? "");
      const plan = e.plan_id ? planById.get(e.plan_id) : null;
      return {
        category_slug: e.purpose_id,
        category_name: purpose?.label ?? e.purpose_id,
        rank: e.rank,
        service_id: e.service_id,
        service_slug: service?.slug ?? null,
        plan_id: e.plan_id,
        plan_name: plan?.name ?? null,
        rating: e.rating,
        card_comment: e.card_comment,
        sub_comment: e.sub_comment,
        is_visible: e.is_visible,
        status: rankingDraft?.status ?? "draft",
        display_order: e.rank,
      };
    },
  );

  const syncInfoRows: SheetRow[] = [
    {
      exported_at: new Date().toISOString(),
      exported_by: exportedBy ?? "",
      schema_version: SCHEMA_VERSION,
      service_count: serviceRows.length,
      plan_count: planRows.length,
      campaign_count: campaignRows.length,
      comparison_item_count: comparisonItemRows.length,
      comparison_layout_count: comparisonLayoutRows.length,
      scraping_candidate_count: scrapingCandidateRows.length,
      ranking_count: rankingRows.length,
    },
  ];

  return {
    serviceRows,
    planRows,
    comparisonItemRows,
    comparisonLayoutRows,
    campaignRows,
    scrapingCandidateRows,
    rankingRows,
    syncInfoRows,
    serviceHeaders: SERVICE_FIELDS.map((f) => f.key),
    planHeaders: PLAN_FIELDS.map((f) => f.key),
    comparisonItemHeaders: COMPARISON_ITEM_FIELDS.map((f) => f.key),
    comparisonLayoutHeaders: COMPARISON_LAYOUT_FIELDS.map((f) => f.key),
    campaignHeaders: [
      "campaign_id",
      "service_id",
      "キャンペーン名",
      "概要",
      "割引率",
      "割引額",
      "クーポン",
      "初月無料",
      "終了日",
      "出典URL",
      "公開状態",
    ] as string[],
    scrapingCandidateHeaders: [
      "candidate_id",
      "service_id",
      "項目キー",
      "現在値",
      "候補値",
      "信頼度",
      "取得元",
      "取得日時",
      "公開状態",
    ] as string[],
    rankingHeaders: RANKING_FIELDS.map((f) => f.key),
    syncInfoHeaders: [...SYNC_INFO_HEADERS],
    services: serviceList,
    plans: planList,
    comparisonFields,
    counts: {
      services: serviceRows.length,
      plans: planList.length,
      comparisonItems: comparisonItemRows.length,
      campaigns: campaignRows.length,
      comparisonLayout: comparisonLayoutRows.length,
      scrapingCandidates: scrapingCandidateRows.length,
      rankings: rankingRows.length,
    },
  };
}

/** Legacy flat export shape used by older CSV helpers */
export async function loadFlatExportRows() {
  const data = await loadSpreadsheetExportData();
  return {
    rows: data.serviceRows,
    headers: data.serviceHeaders,
    comparisonFields: data.comparisonFields,
    services: data.services,
  };
}

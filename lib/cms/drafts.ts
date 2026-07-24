import type { SupabaseClient } from "@supabase/supabase-js";
import { preserveDraftLogoUrl } from "@/lib/admin/logo-url";
import type {
  Database,
  Json,
  Service,
  ServicePlan,
  ComparisonValue,
} from "@/lib/types/database";
import type {
  CmsChangeSource,
  CmsServiceDraft,
  ServiceCampaign,
  ServiceDraftPayload,
} from "@/lib/cms/types";
import { normalizeDraftPlanSlugs } from "@/lib/cms/plan-slug";

type Client = SupabaseClient<Database>;

function toJson(payload: ServiceDraftPayload): Json {
  return payload as unknown as Json;
}

const SERVICE_DRAFT_COLUMNS =
  "id, category_id, name, slug, short_name, catchphrase, about_text, logo_url, thumbnail_url, official_url, primary_link_url, affiliate_url, affiliate_network, affiliate_status, status, is_published, is_site_visible, is_featured, display_order, editor_score, show_in_top_featured_comparison, show_in_top_comparison, top_featured_display_order, top_comparison_display_order, recommended_uses, seo_title, seo_description, canonical_url, og_image_url, company_name, service_start_year, datacenter_location, editor_comment, overall_score, suitable_beginner, suitable_blog, suitable_business, suitable_ec, adult_allowed, has_unpublished_changes, draft_updated_at, last_published_at, last_change_source, data_version, created_at, updated_at";

const PLAN_DRAFT_COLUMNS =
  "id, service_id, name, display_name, slug, regular_monthly_price, campaign_monthly_price, effective_monthly_price, initial_fee, billing_period, storage_value, storage_unit, storage_type, description, display_order, is_published, is_default_comparison_plan, is_recommended, official_url, cpu, memory, transfer_amount, free_trial_days, free_domain_count, multi_domain_count, database_count, payment_methods, min_contract_period, field_overrides, publish_status, has_unpublished_changes, created_at, updated_at";

const VALUE_COLUMNS =
  "id, service_id, plan_id, comparison_field_id, boolean_value, number_value, text_value, created_at, updated_at";

const CAMPAIGN_COLUMNS =
  "id, service_id, name, summary, target_plan_ids, discount_rate, discount_amount, coupon_code, cashback_note, first_month_free, ends_on, source_url, publish_status, is_published, has_unpublished_changes, display_order, created_at, updated_at";

function asPayload(raw: unknown): ServiceDraftPayload {
  if (!raw || typeof raw !== "object") {
    return { service: {}, plans: [], comparison_values: [], campaigns: [] };
  }
  const obj = raw as Record<string, unknown>;
  return {
    service: (obj.service as Record<string, unknown>) ?? {},
    plans: Array.isArray(obj.plans) ? (obj.plans as Record<string, unknown>[]) : [],
    comparison_values: Array.isArray(obj.comparison_values)
      ? (obj.comparison_values as Record<string, unknown>[])
      : [],
    campaigns: Array.isArray(obj.campaigns)
      ? (obj.campaigns as Record<string, unknown>[])
      : [],
    seo: (obj.seo as Record<string, unknown>) ?? undefined,
  };
}

const SERVICE_DRAFT_COLUMNS_LEGACY =
  "id, category_id, name, slug, short_name, catchphrase, about_text, logo_url, thumbnail_url, official_url, primary_link_url, status, is_published, is_featured, display_order, editor_score, show_in_top_featured_comparison, show_in_top_comparison, top_featured_display_order, top_comparison_display_order, recommended_uses, seo_title, seo_description, canonical_url, og_image_url, data_version, created_at, updated_at";

const PLAN_DRAFT_COLUMNS_LEGACY =
  "id, service_id, name, slug, regular_monthly_price, campaign_monthly_price, effective_monthly_price, initial_fee, billing_period, storage_value, storage_unit, description, display_order, is_published, is_default_comparison_plan, is_recommended, official_url, created_at, updated_at";

export async function buildLivePayload(
  supabase: Client,
  serviceId: string,
): Promise<ServiceDraftPayload | null> {
  let serviceRes = await supabase
    .from("services")
    .select(SERVICE_DRAFT_COLUMNS)
    .eq("id", serviceId)
    .maybeSingle();
  if (serviceRes.error) {
    serviceRes = await supabase
      .from("services")
      .select(SERVICE_DRAFT_COLUMNS_LEGACY)
      .eq("id", serviceId)
      .maybeSingle();
  }

  let plans: Record<string, unknown>[] | null = null;
  {
    const full = await supabase
      .from("service_plans")
      .select(PLAN_DRAFT_COLUMNS)
      .eq("service_id", serviceId)
      .order("display_order", { ascending: true });
    if (full.error) {
      const legacy = await supabase
        .from("service_plans")
        .select(PLAN_DRAFT_COLUMNS_LEGACY)
        .eq("service_id", serviceId)
        .order("display_order", { ascending: true });
      plans = (legacy.data ?? null) as Record<string, unknown>[] | null;
    } else {
      plans = (full.data ?? null) as Record<string, unknown>[] | null;
    }
  }

  const [{ data: values }, campaignsRes] = await Promise.all([
    supabase
      .from("comparison_values")
      .select(VALUE_COLUMNS)
      .eq("service_id", serviceId),
    supabase
      .from("service_campaigns")
      .select(CAMPAIGN_COLUMNS)
      .eq("service_id", serviceId)
      .order("display_order", { ascending: true }),
  ]);

  const service = serviceRes.data;
  const campaigns = campaignsRes.error ? [] : campaignsRes.data;

  if (!service) return null;

  return {
    service: service as unknown as Record<string, unknown>,
    plans: (plans ?? []) as unknown as Record<string, unknown>[],
    comparison_values: (values ?? []) as unknown as Record<string, unknown>[],
    campaigns: (campaigns ?? []) as unknown as Record<string, unknown>[],
    seo: {
      seo_title: (service as Service).seo_title,
      seo_description: (service as Service).seo_description,
      canonical_url: (service as Service).canonical_url,
      og_image_url: (service as Service).og_image_url,
    },
  };
}

export async function ensureServiceDraft(
  supabase: Client,
  serviceId: string,
): Promise<CmsServiceDraft | null> {
  const existingRes = await supabase
    .from("cms_service_drafts")
    .select(
      "service_id, payload, published_snapshot, status, change_count, last_change_source, updated_by, created_at, updated_at",
    )
    .eq("service_id", serviceId)
    .maybeSingle();

  // Table may not exist until migration is applied — fall back to live-as-draft
  if (existingRes.error) {
    const live = await buildLivePayload(supabase, serviceId);
    if (!live) return null;
    return {
      service_id: serviceId,
      payload: live,
      published_snapshot: live.service.is_published === true ? live : null,
      status: live.service.is_published === true ? "published" : "draft",
      change_count: 0,
      last_change_source: null,
      updated_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const existing = existingRes.data;
  if (existing) {
    return {
      ...existing,
      payload: asPayload(existing.payload),
      published_snapshot: existing.published_snapshot
        ? asPayload(existing.published_snapshot)
        : null,
      last_change_source: existing.last_change_source as CmsServiceDraft["last_change_source"],
      status: existing.status as CmsServiceDraft["status"],
    };
  }

  const live = await buildLivePayload(supabase, serviceId);
  if (!live) return null;

  const status =
    live.service.is_published === true
      ? "published"
      : live.service.status === "unpublished"
        ? "unpublished"
        : "draft";

  const { data: inserted, error } = await supabase
    .from("cms_service_drafts")
    .upsert(
      {
        service_id: serviceId,
        payload: toJson(live),
        published_snapshot:
          live.service.is_published === true ? toJson(live) : null,
        status,
        change_count: 0,
      },
      { onConflict: "service_id" },
    )
    .select(
      "service_id, payload, published_snapshot, status, change_count, last_change_source, updated_by, created_at, updated_at",
    )
    .single();

  if (error || !inserted) return null;

  return {
    ...inserted,
    payload: asPayload(inserted.payload),
    published_snapshot: inserted.published_snapshot
      ? asPayload(inserted.published_snapshot)
      : null,
    last_change_source: inserted.last_change_source as CmsServiceDraft["last_change_source"],
    status: inserted.status as CmsServiceDraft["status"],
  };
}

export function countPayloadDiffs(
  draft: ServiceDraftPayload,
  published: ServiceDraftPayload | null,
): number {
  if (!published) return 1;
  let count = 0;
  const keys = new Set([
    ...Object.keys(draft.service),
    ...Object.keys(published.service),
  ]);
  for (const key of keys) {
    if (["updated_at", "created_at", "data_version", "has_unpublished_changes", "draft_updated_at"].includes(key)) {
      continue;
    }
    if (JSON.stringify(draft.service[key]) !== JSON.stringify(published.service[key])) {
      count += 1;
    }
  }
  if (JSON.stringify(draft.plans) !== JSON.stringify(published.plans)) {
    count += Math.max(1, Math.abs(draft.plans.length - published.plans.length));
  }
  if (
    JSON.stringify(draft.comparison_values) !==
    JSON.stringify(published.comparison_values)
  ) {
    count += 1;
  }
  if (JSON.stringify(draft.campaigns) !== JSON.stringify(published.campaigns)) {
    count += 1;
  }
  return count;
}

export async function saveServiceDraft(
  supabase: Client,
  serviceId: string,
  payload: ServiceDraftPayload,
  source: CmsChangeSource,
  userId: string | null,
): Promise<{ ok: true; changeCount: number } | { ok: false; message: string }> {
  const current = await ensureServiceDraft(supabase, serviceId);
  if (!current) return { ok: false, message: "サービスが見つかりません。" };

  const serviceSlug =
    typeof payload.service.slug === "string"
      ? payload.service.slug
      : typeof current.payload.service.slug === "string"
        ? current.payload.service.slug
        : null;
  const normalizedPayload: ServiceDraftPayload = {
    ...payload,
    service: preserveDraftLogoUrl(
      payload.service,
      current.payload.service,
      current.published_snapshot?.service,
    ),
    plans: normalizeDraftPlanSlugs(payload.plans, serviceSlug),
  };

  const changeCount = countPayloadDiffs(
    normalizedPayload,
    current.published_snapshot,
  );
  const status =
    changeCount > 0
      ? "pending_review"
      : current.published_snapshot
        ? "published"
        : "draft";

  const { error } = await supabase.from("cms_service_drafts").upsert(
    {
      service_id: serviceId,
      payload: toJson(normalizedPayload),
      published_snapshot: current.published_snapshot
        ? toJson(current.published_snapshot)
        : null,
      status,
      change_count: changeCount,
      last_change_source: source,
      updated_by: userId,
    },
    { onConflict: "service_id" },
  );

  if (error) return { ok: false, message: error.message };

  await supabase
    .from("services")
    .update({
      has_unpublished_changes: changeCount > 0,
      draft_updated_at: new Date().toISOString(),
      last_change_source: source,
    })
    .eq("id", serviceId);

  return { ok: true, changeCount };
}

export async function discardServiceDraft(
  supabase: Client,
  serviceId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const current = await ensureServiceDraft(supabase, serviceId);
  if (!current) return { ok: false, message: "サービスが見つかりません。" };

  const restored = current.published_snapshot ?? (await buildLivePayload(supabase, serviceId));
  if (!restored) return { ok: false, message: "公開スナップショットがありません。" };

  const { error } = await supabase
    .from("cms_service_drafts")
    .update({
      payload: toJson(restored),
      status: restored.service.is_published === true ? "published" : "draft",
      change_count: 0,
      last_change_source: null,
    })
    .eq("service_id", serviceId);

  if (error) return { ok: false, message: error.message };

  await supabase
    .from("services")
    .update({
      has_unpublished_changes: false,
      draft_updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId);

  await supabase
    .from("cms_change_items")
    .update({ status: "discarded", selected_for_publish: false })
    .eq("parent_service_id", serviceId)
    .in("status", ["draft", "pending_review"]);

  return { ok: true };
}

export function draftServiceAsService(payload: ServiceDraftPayload): Service {
  return payload.service as unknown as Service;
}

export function draftPlans(payload: ServiceDraftPayload): ServicePlan[] {
  return payload.plans as unknown as ServicePlan[];
}

export function draftValues(payload: ServiceDraftPayload): ComparisonValue[] {
  return payload.comparison_values as unknown as ComparisonValue[];
}

export function draftCampaigns(payload: ServiceDraftPayload): ServiceCampaign[] {
  return payload.campaigns as unknown as ServiceCampaign[];
}

export { SERVICE_DRAFT_COLUMNS, PLAN_DRAFT_COLUMNS, VALUE_COLUMNS, CAMPAIGN_COLUMNS };

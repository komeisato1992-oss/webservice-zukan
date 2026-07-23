import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/types/database";
import { AFFECTED_PAGE_LABELS, type ServiceDraftPayload } from "@/lib/cms/types";
import { ensureServiceDraft } from "@/lib/cms/drafts";
import { normalizeDraftPlanSlugs } from "@/lib/cms/plan-slug";
import { revalidatePublicSiteCache } from "@/lib/site/cache";

type Client = SupabaseClient<Database>;

export type PublishSelection = {
  /** If empty, publish all pending draft fields for the service */
  changeItemIds?: string[];
  /** Publish whole service draft payload (plans/campaigns/values included) */
  publishFullDraft?: boolean;
  /** Optional plan ids to include when partial */
  planIds?: string[];
  /** Optional campaign ids */
  campaignIds?: string[];
  /** Field keys from comparison/service to include */
  fieldKeys?: string[];
};

/** Live `services` columns that publish may write (excludes draft-only / meta keys). */
const SERVICE_LIVE_COLUMNS = [
  "category_id",
  "name",
  "slug",
  "short_name",
  "catchphrase",
  "about_text",
  "logo_url",
  "thumbnail_url",
  "official_url",
  "primary_link_url",
  "affiliate_url",
  "affiliate_network",
  "affiliate_status",
  "status",
  "is_published",
  "is_site_visible",
  "is_featured",
  "display_order",
  "editor_score",
  "show_in_top_featured_comparison",
  "show_in_top_comparison",
  "top_featured_display_order",
  "top_comparison_display_order",
  "recommended_uses",
  "seo_title",
  "seo_description",
  "canonical_url",
  "og_image_url",
  "company_name",
  "service_start_year",
  "datacenter_location",
  "editor_comment",
  "overall_score",
  "suitable_beginner",
  "suitable_blog",
  "suitable_business",
  "suitable_ec",
  "adult_allowed",
  "last_change_source",
  "data_version",
] as const;

/** Live `service_plans` columns that publish may write. */
const PLAN_LIVE_COLUMNS = [
  "service_id",
  "name",
  "display_name",
  "slug",
  "regular_monthly_price",
  "campaign_monthly_price",
  "effective_monthly_price",
  "initial_fee",
  "billing_period",
  "storage_value",
  "storage_unit",
  "storage_type",
  "description",
  "display_order",
  "is_published",
  "is_default_comparison_plan",
  "is_recommended",
  "official_url",
  "cpu",
  "memory",
  "transfer_amount",
  "free_trial_days",
  "free_domain_count",
  "multi_domain_count",
  "database_count",
  "payment_methods",
  "min_contract_period",
  "field_overrides",
  "publish_status",
  "has_unpublished_changes",
] as const;

const CAMPAIGN_LIVE_COLUMNS = [
  "service_id",
  "name",
  "summary",
  "target_plan_ids",
  "discount_rate",
  "discount_amount",
  "coupon_code",
  "cashback_note",
  "first_month_free",
  "ends_on",
  "source_url",
  "publish_status",
  "is_published",
  "has_unpublished_changes",
  "display_order",
] as const;

const COMPARISON_VALUE_LIVE_COLUMNS = [
  "service_id",
  "plan_id",
  "comparison_field_id",
  "boolean_value",
  "number_value",
  "text_value",
] as const;

function pickColumns(
  row: Record<string, unknown>,
  columns: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of columns) {
    if (key in row) out[key] = row[key];
  }
  return out;
}

function pickServiceColumns(service: Record<string, unknown>) {
  return pickColumns(service, SERVICE_LIVE_COLUMNS);
}

function pickPlanColumns(plan: Record<string, unknown>) {
  return pickColumns(plan, PLAN_LIVE_COLUMNS);
}

function missingColumnFromError(message: string | undefined): string | null {
  if (!message) return null;
  const a = message.match(/column\s+(?:\w+\.)?(\w+)\s+does not exist/i);
  if (a?.[1]) return a[1];
  const b = message.match(/Could not find the '(\w+)' column/i);
  if (b?.[1]) return b[1];
  return null;
}

/** Update/insert while omitting columns absent from the remote schema. */
async function writeOmittingMissingColumns(
  run: (
    patch: Record<string, unknown>,
  ) => PromiseLike<{ error: { message: string } | null }>,
  initial: Record<string, unknown>,
  label: string,
) {
  let patch = { ...initial };
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const { error } = await run(patch);
    if (!error) return;
    const missing = missingColumnFromError(error.message);
    if (!missing || !(missing in patch)) {
      throw error;
    }
    console.warn(`[publish] ${label}: omitting missing column "${missing}"`);
    const next = { ...patch };
    delete next[missing];
    patch = next;
  }
  throw new Error(`${label}: too many missing columns`);
}

/** Apply a payload snapshot to live tables (used by publish and draft restore). */
export async function applyPayloadToLive(
  supabase: Client,
  serviceId: string,
  payload: ServiceDraftPayload,
  selection: PublishSelection,
) {
  const servicePatch = pickServiceColumns(payload.service);
  if (selection.fieldKeys?.length) {
    const filtered: Record<string, unknown> = {};
    for (const key of selection.fieldKeys) {
      if (key in servicePatch) filtered[key] = servicePatch[key];
    }
    if (Object.keys(filtered).length) {
      await writeOmittingMissingColumns(
        (patch) =>
          supabase.from("services").update(patch as never).eq("id", serviceId),
        filtered,
        "services",
      );
    }
  } else if (selection.publishFullDraft !== false) {
    await writeOmittingMissingColumns(
      (patch) =>
        supabase.from("services").update(patch as never).eq("id", serviceId),
      {
        ...servicePatch,
        has_unpublished_changes: false,
        last_published_at: new Date().toISOString(),
      },
      "services",
    );
  }

  const serviceSlug =
    typeof payload.service.slug === "string" ? payload.service.slug : null;
  const plans = normalizeDraftPlanSlugs(
    payload.plans.filter((p) => {
      if (!selection.planIds?.length) return true;
      return selection.planIds.includes(String(p.id));
    }),
    serviceSlug,
  );

  for (const plan of plans) {
    const planId = String(plan.id);
    const planRest = pickPlanColumns(plan);
    const { data: existing } = await supabase
      .from("service_plans")
      .select("id")
      .eq("id", planId)
      .maybeSingle();

    if (existing) {
      await writeOmittingMissingColumns(
        (patch) =>
          supabase.from("service_plans").update(patch as never).eq("id", planId),
        {
          ...planRest,
          has_unpublished_changes: false,
          publish_status: plan.is_published ? "published" : "draft",
        },
        `service_plans:${planId}`,
      );
    } else {
      await writeOmittingMissingColumns(
        (patch) => supabase.from("service_plans").insert(patch as never),
        {
          ...planRest,
          id: planId,
          service_id: serviceId,
        },
        `service_plans:insert:${planId}`,
      );
    }
  }

  // Replace comparison values for this service when full publish
  if (selection.publishFullDraft !== false && !selection.fieldKeys?.length) {
    await supabase.from("comparison_values").delete().eq("service_id", serviceId);
    if (payload.comparison_values.length) {
      const rows = payload.comparison_values.map((v) => {
        const id = typeof v.id === "string" ? v.id : undefined;
        const rest = pickColumns(v, COMPARISON_VALUE_LIVE_COLUMNS);
        return {
          ...rest,
          service_id: serviceId,
          id,
        };
      });
      const { error } = await supabase
        .from("comparison_values")
        .upsert(rows as never[]);
      if (error) throw error;
    }
  }

  const campaigns = payload.campaigns.filter((c) => {
    if (!selection.campaignIds?.length) return true;
    return selection.campaignIds.includes(String(c.id));
  });

  for (const campaign of campaigns) {
    const campaignId = String(campaign.id);
    const campRest = pickColumns(campaign, CAMPAIGN_LIVE_COLUMNS);
    const { data: existing } = await supabase
      .from("service_campaigns")
      .select("id")
      .eq("id", campaignId)
      .maybeSingle();

    const row = {
      ...campRest,
      service_id: serviceId,
      is_published: campRest.publish_status === "published" || campRest.is_published === true,
      has_unpublished_changes: false,
    };

    if (existing) {
      await writeOmittingMissingColumns(
        (patch) =>
          supabase
            .from("service_campaigns")
            .update(patch as never)
            .eq("id", campaignId),
        row,
        `service_campaigns:${campaignId}`,
      );
    } else {
      await writeOmittingMissingColumns(
        (patch) => supabase.from("service_campaigns").insert(patch as never),
        { ...row, id: campaignId },
        `service_campaigns:insert:${campaignId}`,
      );
    }
  }
}

function buildHistoryFromPayload(
  serviceId: string,
  draft: ServiceDraftPayload,
  published: ServiceDraftPayload | null,
) {
  const items: {
    entity_type: string;
    entity_id: string | null;
    service_id: string;
    plan_id: string | null;
    field_key: string;
    field_label: string;
    old_value: Json | null;
    new_value: Json | null;
    change_source: string;
  }[] = [];

  const pubService = published?.service ?? {};
  for (const key of Object.keys(draft.service)) {
    if (
      ["updated_at", "created_at", "data_version", "has_unpublished_changes", "draft_updated_at"].includes(
        key,
      )
    ) {
      continue;
    }
    if (JSON.stringify(draft.service[key]) !== JSON.stringify(pubService[key])) {
      items.push({
        entity_type: "service",
        entity_id: serviceId,
        service_id: serviceId,
        plan_id: null,
        field_key: key,
        field_label: key,
        old_value: (pubService[key] as Json) ?? null,
        new_value: (draft.service[key] as Json) ?? null,
        change_source: "admin",
      });
    }
  }

  if (JSON.stringify(draft.plans) !== JSON.stringify(published?.plans ?? [])) {
    items.push({
      entity_type: "plan",
      entity_id: serviceId,
      service_id: serviceId,
      plan_id: null,
      field_key: "plans",
      field_label: "プラン",
      old_value: (published?.plans as Json) ?? null,
      new_value: draft.plans as Json,
      change_source: "admin",
    });
  }

  if (
    JSON.stringify(draft.comparison_values) !==
    JSON.stringify(published?.comparison_values ?? [])
  ) {
    items.push({
      entity_type: "comparison_value",
      entity_id: serviceId,
      service_id: serviceId,
      plan_id: null,
      field_key: "comparison_values",
      field_label: "比較値",
      old_value: (published?.comparison_values as Json) ?? null,
      new_value: draft.comparison_values as Json,
      change_source: "admin",
    });
  }

  if (JSON.stringify(draft.campaigns) !== JSON.stringify(published?.campaigns ?? [])) {
    items.push({
      entity_type: "campaign",
      entity_id: serviceId,
      service_id: serviceId,
      plan_id: null,
      field_key: "campaigns",
      field_label: "キャンペーン",
      old_value: (published?.campaigns as Json) ?? null,
      new_value: draft.campaigns as Json,
      change_source: "admin",
    });
  }

  return items;
}

export async function publishServiceDraft(
  supabase: Client,
  serviceId: string,
  userId: string | null,
  selection: PublishSelection = { publishFullDraft: true },
): Promise<{ ok: true; publishEventId: string; changeCount: number } | { ok: false; message: string }> {
  const draft = await ensureServiceDraft(supabase, serviceId);
  if (!draft) return { ok: false, message: "ドラフトが見つかりません。" };
  if (draft.change_count === 0 && draft.published_snapshot) {
    return { ok: false, message: "公開する変更がありません。" };
  }

  try {
    await applyPayloadToLive(supabase, serviceId, draft.payload, selection);

    const history = buildHistoryFromPayload(
      serviceId,
      draft.payload,
      draft.published_snapshot,
    );

    const { data: event, error: eventError } = await supabase
      .from("cms_publish_events")
      .insert({
        published_by: userId,
        summary: `${String(draft.payload.service.name ?? serviceId)} を公開`,
        affected_pages: [...AFFECTED_PAGE_LABELS],
        change_count: history.length,
        service_ids: [serviceId],
        meta: { selection } as Json,
      })
      .select("id")
      .single();

    if (eventError || !event) {
      return { ok: false, message: eventError?.message ?? "公開履歴の作成に失敗しました。" };
    }

    if (history.length) {
      await supabase.from("cms_publish_history_items").insert(
        history.map((h) => ({
          ...h,
          publish_event_id: event.id,
        })),
      );
    }

    await supabase
      .from("cms_change_items")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        publish_event_id: event.id,
      })
      .eq("parent_service_id", serviceId)
      .in("status", ["draft", "pending_review"])
      .eq("selected_for_publish", true);

    await supabase
      .from("cms_service_drafts")
      .update({
        published_snapshot: draft.payload as unknown as Json,
        payload: draft.payload as unknown as Json,
        status: "published",
        change_count: 0,
      })
      .eq("service_id", serviceId);

    await supabase
      .from("services")
      .update({
        has_unpublished_changes: false,
        last_published_at: new Date().toISOString(),
        status: "published",
        is_published: true,
      })
      .eq("id", serviceId);

    revalidatePublicSiteCache();
    return { ok: true, publishEventId: event.id, changeCount: history.length };
  } catch (error) {
    const message = formatPublishError(error);
    console.error("[publishServiceDraft]", message, error);
    return {
      ok: false,
      message,
    };
  }
}

function formatPublishError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const e = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    if (typeof e.message === "string" && e.message.trim()) {
      const code = typeof e.code === "string" ? ` (${e.code})` : "";
      const details = typeof e.details === "string" && e.details ? ` — ${e.details}` : "";
      const hint = typeof e.hint === "string" && e.hint ? ` hint: ${e.hint}` : "";
      return `${e.message}${code}${details}${hint}`;
    }
  }
  return "公開に失敗しました。";
}

export async function publishComparisonLayoutDrafts(
  supabase: Client,
  userId: string | null,
  fieldUpdates: {
    id: string;
    show_in_top_featured: boolean;
    show_in_top_table: boolean;
    show_in_compare_page: boolean;
    top_featured_display_order: number | null;
    top_table_display_order: number | null;
    compare_page_display_order: number | null;
  }[],
): Promise<{ ok: true; publishEventId: string } | { ok: false; message: string }> {
  for (const u of fieldUpdates) {
    const { error } = await supabase
      .from("comparison_fields")
      .update({
        show_in_top_featured: u.show_in_top_featured,
        show_in_top_table: u.show_in_top_table,
        show_in_compare_page: u.show_in_compare_page,
        top_featured_display_order: u.top_featured_display_order,
        top_table_display_order: u.top_table_display_order,
        compare_page_display_order: u.compare_page_display_order,
        draft_show_in_top_featured: null,
        draft_show_in_top_table: null,
        draft_show_in_compare_page: null,
        has_unpublished_changes: false,
        publish_status: "published",
      })
      .eq("id", u.id);
    if (error) return { ok: false, message: error.message };
  }

  const { data: event, error } = await supabase
    .from("cms_publish_events")
    .insert({
      published_by: userId,
      summary: "比較表の表示設定を公開",
      affected_pages: [
        "TOP 人気3社比較",
        "TOP レンタルサーバー比較",
        "比較ページ",
      ],
      change_count: fieldUpdates.length,
      service_ids: [],
      meta: { type: "comparison_layout" } as Json,
    })
    .select("id")
    .single();

  if (error || !event) {
    return { ok: false, message: error?.message ?? "公開に失敗しました。" };
  }

  revalidatePublicSiteCache();
  return { ok: true, publishEventId: event.id };
}

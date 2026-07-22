import { notFound } from "next/navigation";
import { ServiceCmsEditor } from "@/components/admin/cms/service-cms-editor";
import { ensureServiceDraft } from "@/lib/cms/drafts";
import { createClient } from "@/lib/supabase/server";
import type { ComparisonField } from "@/lib/types/database";
import type { ScrapingCandidate } from "@/lib/cms/types";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

const SERVICE_COLUMNS =
  "id, category_id, name, slug, short_name, catchphrase, summary, description, logo_url, thumbnail_url, official_url, primary_link_url, affiliate_url, affiliate_network, affiliate_status, status, is_published, is_featured, display_order, editor_score, show_in_top_featured_comparison, show_in_top_comparison, top_featured_display_order, top_comparison_display_order, recommended_uses, seo_title, seo_description, canonical_url, og_image_url, company_name, service_start_year, datacenter_location, editor_comment, overall_score, suitable_beginner, suitable_blog, suitable_business, suitable_ec, adult_allowed, has_unpublished_changes, draft_updated_at, last_published_at, last_change_source, created_at, updated_at";

const FIELD_COLUMNS =
  "id, category_id, name, slug, field_type, unit, description, display_group, select_options, display_order, is_filterable, is_highlighted, is_published, value_source, compare_rule, show_in_top_featured, top_featured_display_order, show_in_top_table, top_table_display_order, show_in_compare_page, compare_page_display_order, publish_status, has_unpublished_changes";

const CANDIDATE_COLUMNS =
  "id, scraping_run_id, service_id, plan_id, field_key, field_label, current_published_value, current_draft_value, candidate_value, evidence, source_url, confidence, fetched_at, status, reviewed_by, reviewed_at, created_at, updated_at";

export default async function EditServicePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: categories }, { data: service }] = await Promise.all([
    supabase
      .from("categories")
      .select(
        "id, name, slug, description, icon, display_order, is_published, seo_title, seo_description, created_at, updated_at",
      )
      .order("display_order", { ascending: true }),
    supabase.from("services").select(SERVICE_COLUMNS).eq("id", id).maybeSingle(),
  ]);

  if (!service) notFound();

  const draft = await ensureServiceDraft(supabase, id);
  if (!draft) notFound();

  const [{ data: comparisonFields }, { data: candidates }] = await Promise.all([
    supabase
      .from("comparison_fields")
      .select(FIELD_COLUMNS)
      .eq("category_id", service.category_id)
      .order("display_order", { ascending: true }),
    supabase
      .from("scraping_candidates")
      .select(CANDIDATE_COLUMNS)
      .eq("service_id", id)
      .eq("status", "pending")
      .order("fetched_at", { ascending: false }),
  ]);

  return (
    <ServiceCmsEditor
      categories={categories ?? []}
      service={service}
      draft={draft}
      comparisonFields={(comparisonFields as ComparisonField[]) ?? []}
      candidates={(candidates as ScrapingCandidate[]) ?? []}
    />
  );
}

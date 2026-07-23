import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasSupabasePublicEnv } from "@/lib/env";
import {
  categoryPath,
  isReservedPathSegment,
  resolveOutboundLink,
} from "@/lib/links";
import { createPublicClient } from "@/lib/supabase/public";
import type { AffiliateLink, Service } from "@/lib/types/database";
import { formatPrice, formatStorage } from "@/lib/types/comparison";
import { ServiceComparisonSection } from "@/components/site/service-comparison-section";
import { ServiceLogo } from "@/components/site/service-logo";
import { OfficialSiteButton } from "@/components/site/official-site-button";
import { AddToCompareButton } from "@/components/site/compare/add-to-compare-button";
import { SITE_BRAND } from "@/lib/site/brand";
import { pickRepresentativePlan } from "@/lib/site/plan-utils";
import { getDefaultOgImagePath, getSiteUrl } from "@/lib/site/seo";
import {
  Breadcrumb,
  PageValueProps,
  buttonClass,
} from "@/components/site/ui";
import {
  DEFAULT_SITE_HIDDEN_SLUGS,
  isPublicSiteService,
} from "@/lib/site/public-data";

/** lib/site/cache.ts の PUBLIC_DATA_REVALIDATE_SECONDS と揃える（静的リテラル必須） */
export const revalidate = 300;

type Props = {
  params: Promise<{ categorySlug: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug, slug } = await params;
  if (!hasSupabasePublicEnv() || isReservedPathSegment(categorySlug)) {
    return { title: "サービス詳細" };
  }

  const supabase = createPublicClient();
  const { data: category } = await supabase
    .from("categories")
    .select("id, name")
    .eq("slug", categorySlug)
    .eq("is_published", true)
    .maybeSingle();

  if (!category) return { title: "サービス詳細" };

  let metaService: {
    name: string;
    slug: string;
    seo_title: string | null;
    seo_description: string | null;
    catchphrase: string | null;
    og_image_url: string | null;
    canonical_url: string | null;
    is_site_visible?: boolean | null;
  } | null = null;

  {
    const withVisible = await supabase
      .from("services")
      .select(
        "name, slug, seo_title, seo_description, catchphrase, og_image_url, canonical_url, is_site_visible",
      )
      .eq("category_id", category.id)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (withVisible.error) {
      const without = await supabase
        .from("services")
        .select(
          "name, slug, seo_title, seo_description, catchphrase, og_image_url, canonical_url",
        )
        .eq("category_id", category.id)
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      metaService = without.data;
    } else {
      metaService = withVisible.data;
    }
  }

  if (
    !metaService ||
    !isPublicSiteService({
      is_published: true,
      is_site_visible: metaService.is_site_visible,
      slug: metaService.slug,
    })
  ) {
    return { title: "サービス詳細" };
  }
  const service = metaService;
  const selfPath = categoryPath(categorySlug, "services", service.slug);
  const pageUrl = `${getSiteUrl()}${selfPath}`;
  const title = service.seo_title || service.name;
  const description =
    service.seo_description || service.catchphrase || undefined;
  const ogImage = service.og_image_url || getDefaultOgImagePath();

  return {
    title,
    description,
    alternates: {
      canonical: service.canonical_url || selfPath,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      images: [ogImage],
      type: "website",
      locale: "ja_JP",
      siteName: SITE_BRAND,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { categorySlug, slug } = await params;
  if (isReservedPathSegment(categorySlug) || !hasSupabasePublicEnv()) {
    notFound();
  }

  const supabase = createPublicClient();
  const { data: category } = await supabase
    .from("categories")
    .select(
      "id, name, slug, description, icon, display_order, is_published, seo_title, seo_description, created_at, updated_at",
    )
    .eq("slug", categorySlug)
    .eq("is_published", true)
    .maybeSingle();

  if (!category) notFound();

  let serviceRes = await supabase
    .from("services")
    .select(
      "id, category_id, name, slug, short_name, catchphrase, about_text, logo_url, thumbnail_url, official_url, primary_link_url, affiliate_url, affiliate_network, affiliate_status, status, is_published, is_site_visible, is_featured, display_order, editor_score, recommended_uses, seo_title, seo_description, canonical_url, og_image_url, company_name, service_start_year, datacenter_location, editor_comment, overall_score, created_at, updated_at, affiliate_links(id, service_id, asp_name, program_name, official_url, affiliate_url, approval_status, is_primary, is_active)",
    )
    .eq("category_id", category.id)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (serviceRes.error) {
    serviceRes = await supabase
      .from("services")
      .select(
        "id, category_id, name, slug, short_name, catchphrase, about_text, logo_url, thumbnail_url, official_url, primary_link_url, affiliate_url, affiliate_network, affiliate_status, status, is_published, is_featured, display_order, editor_score, recommended_uses, seo_title, seo_description, canonical_url, og_image_url, company_name, service_start_year, datacenter_location, editor_comment, overall_score, created_at, updated_at, affiliate_links(id, service_id, asp_name, program_name, official_url, affiliate_url, approval_status, is_primary, is_active)",
      )
      .eq("category_id", category.id)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
  }

  const service = serviceRes.data;
  if (!service) notFound();
  if (
    !isPublicSiteService({
      is_published: true,
      is_site_visible: (service as { is_site_visible?: boolean | null })
        .is_site_visible,
      slug: service.slug,
    })
  ) {
    notFound();
  }

  const links = (service.affiliate_links as AffiliateLink[]) ?? [];
  const outbound = resolveOutboundLink(service as Service, links);

  const [{ data: plans }, { data: comparisonFields }, { data: comparisonValues }, { data: related }] =
    await Promise.all([
      supabase
        .from("service_plans")
        .select(
          "id, service_id, name, slug, regular_monthly_price, campaign_monthly_price, effective_monthly_price, initial_fee, billing_period, storage_value, storage_unit, storage_type, free_trial_days, description, display_order, is_published, is_default_comparison_plan, is_recommended, official_url, created_at, updated_at",
        )
        .eq("service_id", service.id)
        .eq("is_published", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("comparison_fields")
        .select(
          "id, category_id, name, slug, field_type, unit, description, display_group, select_options, display_order, is_filterable, is_highlighted, is_published, value_source, compare_rule, created_at, updated_at",
        )
        .eq("category_id", category.id)
        .eq("is_published", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("comparison_values")
        .select(
          "id, service_id, plan_id, comparison_field_id, boolean_value, number_value, text_value, created_at, updated_at",
        )
        .eq("service_id", service.id)
        .is("plan_id", null),
      supabase
        .from("services")
        .select("id, name, slug")
        .eq("category_id", category.id)
        .eq("is_published", true)
        .neq("id", service.id)
        .order("display_order", { ascending: true })
        .limit(6),
    ]);

  const publishedPlans = plans ?? [];
  const repPlan = pickRepresentativePlan(publishedPlans);
  const price =
    repPlan &&
    (repPlan.effective_monthly_price ??
      repPlan.campaign_monthly_price ??
      repPlan.regular_monthly_price) != null
      ? formatPrice(
          repPlan.effective_monthly_price ??
            repPlan.campaign_monthly_price ??
            repPlan.regular_monthly_price,
        )
      : null;
  const storage =
    repPlan && repPlan.storage_value != null
      ? formatStorage(repPlan.storage_value, repPlan.storage_unit)
      : null;

  const suitedFor = service.recommended_uses?.trim() || null;
  const feature = service.catchphrase?.trim() || null;
  const relatedVisible = (related ?? []).filter(
    (item) => !DEFAULT_SITE_HIDDEN_SLUGS.has(item.slug),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumb
        items={[
          { href: "/server", label: SITE_BRAND },
          { href: categoryPath(category.slug), label: category.name },
          {
            href: categoryPath(category.slug, "services"),
            label: "サービス一覧",
          },
          { label: service.name },
        ]}
      />

      <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <ServiceLogo
            name={service.name}
            logoUrl={service.logo_url}
            size="lg"
            className="rounded-[var(--radius-card)]"
            fallback="none"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-[var(--navy)]">
              {category.name}
            </p>
            <h1 className="mt-1 text-[1.625rem] font-bold tracking-tight text-[var(--text-primary)] text-pretty sm:text-[2rem]">
              <span className="jp-keep">{service.name}</span>
            </h1>
            <div className="mt-3">
              <PageValueProps
                items={[
                  "特徴が分かる",
                  "他サービスと比較できる",
                  "注意点を確認できる",
                ]}
              />
            </div>

            <dl className="mt-4 grid gap-2 text-[13px] sm:grid-cols-2">
              {feature ? (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-medium text-[var(--text-muted)]">
                    特徴
                  </dt>
                  <dd className="mt-0.5 text-[var(--text-primary)]">{feature}</dd>
                </div>
              ) : null}
              {suitedFor ? (
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-medium text-[var(--text-muted)]">
                    向いている人
                  </dt>
                  <dd className="mt-0.5 text-[var(--text-body)]">{suitedFor}</dd>
                </div>
              ) : null}
              {price ? (
                <div>
                  <dt className="text-[11px] font-medium text-[var(--text-muted)]">
                    代表料金
                  </dt>
                  <dd className="mt-0.5 text-lg font-bold tabular-nums text-[var(--text-primary)]">
                    {price}
                    <span className="ml-0.5 text-[12px] font-medium text-[var(--text-muted)]">
                      /月
                    </span>
                  </dd>
                </div>
              ) : null}
              {storage ? (
                <div>
                  <dt className="text-[11px] font-medium text-[var(--text-muted)]">
                    容量
                  </dt>
                  <dd className="mt-0.5 font-semibold text-[var(--text-primary)]">
                    {storage}
                  </dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <AddToCompareButton
                slug={service.slug}
                name={service.name}
                categorySlug={category.slug}
                emphasis="primary"
              />
              {outbound ? (
                <OfficialSiteButton
                  href={outbound.href}
                  isAffiliate={outbound.isAffiliate}
                  label="公式サイトを見る"
                  size="md"
                  fullWidth={false}
                  className="min-w-[10rem]"
                  analytics={{
                    service_name: service.name,
                    page_type: "service_detail",
                    button_location: "hero",
                  }}
                />
              ) : null}
              <Link
                href={categoryPath(category.slug, "services")}
                className={buttonClass("ghost", "md")}
              >
                一覧に戻る
              </Link>
            </div>
          </div>
        </div>
      </div>

      {service.about_text?.trim() ? (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {service.name}とは
          </h2>
          <div className="mt-3 whitespace-pre-wrap leading-relaxed text-[var(--text-body)]">
            {service.about_text}
          </div>
        </section>
      ) : null}

      {publishedPlans.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            料金プラン
          </h2>
          <div className="mt-4 space-y-3">
            {publishedPlans.map((plan) => (
              <article
                key={plan.id}
                className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      {plan.name}
                    </h3>
                    {plan.billing_period ? (
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        契約期間: {plan.billing_period}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-[var(--text-muted)]">実質月額</p>
                    <p className="text-xl font-bold text-[var(--navy)]">
                      {formatPrice(plan.effective_monthly_price)}
                    </p>
                  </div>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-[var(--text-muted)]">通常月額</dt>
                    <dd className="mt-1 font-medium text-[var(--text-primary)]">
                      {formatPrice(plan.regular_monthly_price)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">キャンペーン月額</dt>
                    <dd className="mt-1 font-medium text-[var(--text-primary)]">
                      {formatPrice(plan.campaign_monthly_price)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">初期費用</dt>
                    <dd className="mt-1 font-medium text-[var(--text-primary)]">
                      {formatPrice(plan.initial_fee)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">容量</dt>
                    <dd className="mt-1 font-medium text-[var(--text-primary)]">
                      {formatStorage(plan.storage_value, plan.storage_unit)}
                    </dd>
                  </div>
                </dl>
                {plan.description ? (
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-body)]">
                    {plan.description}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <ServiceComparisonSection
        fields={comparisonFields ?? []}
        values={comparisonValues ?? []}
      />

      {relatedVisible.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            他サービスとの比較
          </h2>
          <p className="mt-1.5 text-sm text-[var(--text-body)]">
            同じカテゴリのサービスです。気になる候補は比較に追加してください。
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {relatedVisible.map((item) => (
              <li key={item.id}>
                <Link
                  href={categoryPath(category.slug, "services", item.slug)}
                  className="block rounded-[var(--radius-card)] border border-[var(--border)] px-4 py-3 text-[var(--text-primary)] hover:border-[var(--navy)]/25 hover:bg-[var(--surface)]"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Link
              href={categoryPath(category.slug, "compare")}
              className={buttonClass("secondary", "md")}
            >
              比較ページを開く
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}

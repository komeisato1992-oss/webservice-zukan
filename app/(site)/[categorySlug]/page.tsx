import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasSupabasePublicEnv } from "@/lib/env";
import { categoryPath, isReservedPathSegment, resolveOutboundUrl } from "@/lib/links";
import { createPublicClient } from "@/lib/supabase/public";
import { ServiceCard } from "@/components/site/service-card";
import { ServerTopPage } from "@/components/site/server-top-page";
import { DomainTopPage } from "@/components/site/domain-top-page";
import { PRIMARY_CATEGORY_SLUG, SITE_BRAND } from "@/lib/site/brand";
import {
  DOMAIN_BRAND,
  DOMAIN_CATEGORY_SLUG,
} from "@/lib/site/domain-brand";
import { buildPageMetadata } from "@/lib/site/seo";
import {
  loadServerTopData,
  type ServerTopData,
} from "@/lib/site/public-data";
import {
  loadDomainTopData,
  type DomainTopData,
} from "@/lib/site/domain-public-data";
import { loadPublishedContents } from "@/lib/contents/public";
import {
  filterRankingsByCategoryId,
  loadPublishedRankings,
} from "@/lib/site/rankings-public";
import { resolveDictionaryIdBySlug } from "@/lib/site/dictionary";
import { DataUnavailable } from "@/components/site/data-unavailable";
import type { AffiliateLink, Category, Service } from "@/lib/types/database";

/** lib/site/cache.ts の PUBLIC_DATA_REVALIDATE_SECONDS と揃える（静的リテラル必須） */
export const revalidate = 300;

type Props = { params: Promise<{ categorySlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params;
  if (!hasSupabasePublicEnv() || isReservedPathSegment(categorySlug)) {
    return { title: "カテゴリ" };
  }

  if (categorySlug === PRIMARY_CATEGORY_SLUG) {
    return buildPageMetadata("server", { absoluteTitle: true });
  }

  if (categorySlug === DOMAIN_CATEGORY_SLUG) {
    return buildPageMetadata("domain", {
      absoluteTitle: true,
      siteName: DOMAIN_BRAND,
    });
  }

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("categories")
    .select("name, seo_title, seo_description")
    .eq("slug", categorySlug)
    .eq("is_published", true)
    .maybeSingle();

  return {
    title: data?.seo_title || data?.name || "カテゴリ",
    description: data?.seo_description || undefined,
    alternates: { canonical: `/${categorySlug}` },
  };
}

export default async function CategoryHomePage({ params }: Props) {
  const { categorySlug } = await params;
  if (isReservedPathSegment(categorySlug) || !hasSupabasePublicEnv()) {
    notFound();
  }

  if (categorySlug === PRIMARY_CATEGORY_SLUG) {
    let data: ServerTopData | null = null;
    let failed = false;
    let latestContents: Awaited<ReturnType<typeof loadPublishedContents>> = [];
    let managedRankings: Awaited<ReturnType<typeof loadPublishedRankings>> =
      new Map();
    try {
      const serverDictionaryId =
        await resolveDictionaryIdBySlug(PRIMARY_CATEGORY_SLUG);
      const [topData, contents, rankings] = await Promise.all([
        loadServerTopData(categorySlug),
        loadPublishedContents(3),
        serverDictionaryId
          ? loadPublishedRankings(serverDictionaryId, "server")
          : Promise.resolve(new Map()),
      ]);
      data = topData;
      latestContents = contents;
      managedRankings = rankings;
    } catch (error) {
      failed = true;
      const err = error as {
        message?: unknown;
        code?: unknown;
        details?: unknown;
        hint?: unknown;
        stack?: unknown;
      };
      console.error("[server-top] page load failed", {
        categorySlug,
        message:
          error instanceof Error
            ? error.message
            : typeof err?.message === "string"
              ? err.message
              : String(error),
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
    if (failed || !data) {
      if (!failed && !data) {
        console.error("[server-top] loadServerTopData returned null", {
          categorySlug,
        });
      }
      return <DataUnavailable />;
    }
    const rankings = filterRankingsByCategoryId(
      managedRankings,
      data.category.id,
    );
    return (
      <ServerTopPage
        data={data}
        latestContents={latestContents}
        managedRankings={rankings}
      />
    );
  }

  if (categorySlug === DOMAIN_CATEGORY_SLUG) {
    let data: DomainTopData | null = null;
    let failed = false;
    let managedRankings: Awaited<ReturnType<typeof loadPublishedRankings>> =
      new Map();
    try {
      const domainDictionaryId =
        await resolveDictionaryIdBySlug(DOMAIN_CATEGORY_SLUG);
      const [topData, rankings] = await Promise.all([
        loadDomainTopData(categorySlug),
        domainDictionaryId
          ? loadPublishedRankings(domainDictionaryId, "domain")
          : Promise.resolve(new Map()),
      ]);
      data = topData;
      managedRankings = rankings;
    } catch (error) {
      failed = true;
      console.error("[domain-top] page load failed", {
        categorySlug,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    if (failed || !data) {
      return <DataUnavailable />;
    }

    const rankings = filterRankingsByCategoryId(
      managedRankings,
      data.category.id,
    );

    return (
      <DomainTopPage
        data={data}
        managedRankings={rankings}
      />
    );
  }

  let category: Category | null = null;
  let services: Array<Service & { affiliate_links?: AffiliateLink[] }> | null =
    null;
  let failed = false;

  try {
    const supabase = createPublicClient();
    const { data: categoryRow, error: categoryError } = await supabase
      .from("categories")
      .select(
        "id, name, slug, description, icon, display_order, is_published, seo_title, seo_description, created_at, updated_at",
      )
      .eq("slug", categorySlug)
      .eq("is_published", true)
      .maybeSingle();

    if (categoryError) throw categoryError;
    category = categoryRow;

    if (category) {
      const { data: serviceRows, error: servicesError } = await supabase
        .from("services")
        .select(
          "id, category_id, name, slug, short_name, catchphrase, logo_url, thumbnail_url, official_url, primary_link_url, affiliate_url, status, is_published, is_featured, display_order, editor_score, recommended_uses, seo_title, seo_description, canonical_url, og_image_url, created_at, updated_at, affiliate_links(id, service_id, asp_name, program_name, official_url, affiliate_url, approval_status, is_primary, is_active)",
        )
        .eq("category_id", category.id)
        .eq("is_published", true)
        .order("display_order", { ascending: true })
        .limit(9);

      if (servicesError) throw servicesError;
      services = (serviceRows ?? []) as Array<
        Service & { affiliate_links?: AffiliateLink[] }
      >;
    }
  } catch {
    failed = true;
  }

  if (failed) return <DataUnavailable />;
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <p className="text-sm text-[var(--text-muted)]">
        <Link href="/server" className="hover:text-[var(--accent)]">
          {SITE_BRAND}
        </Link>
        <span className="mx-2">/</span>
        <span>{category.name}</span>
      </p>
      <h1 className="mt-3 text-3xl font-bold text-[var(--text-primary)]">
        {category.name}
      </h1>
      {category.description ? (
        <p className="mt-3 max-w-2xl text-[var(--text-body)]">
          {category.description}
        </p>
      ) : null}
      <div className="mt-6">
        <Link
          href={categoryPath(category.slug, "services")}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--navy)] px-5 text-sm font-medium text-white hover:bg-[var(--navy-light)]"
        >
          サービス一覧へ
        </Link>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(services ?? []).map((service) => (
          <ServiceCard
            key={service.id}
            service={service as Service}
            categorySlug={category.slug}
            affiliateLinks={(service.affiliate_links as AffiliateLink[]) ?? []}
            outboundUrl={resolveOutboundUrl(
              service as Service,
              (service.affiliate_links as AffiliateLink[]) ?? [],
            )}
            pageType="top"
            buttonLocation="service_card"
          />
        ))}
      </div>
    </div>
  );
}

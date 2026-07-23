import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasSupabasePublicEnv } from "@/lib/env";
import { categoryPath, isReservedPathSegment } from "@/lib/links";
import { createPublicClient } from "@/lib/supabase/public";
import { ServiceCard } from "@/components/site/service-card";
import { ServicesListClient } from "@/components/site/services-list-client";
import { SITE_BRAND, PRIMARY_CATEGORY_SLUG } from "@/lib/site/brand";
import { buildPageMetadata } from "@/lib/site/seo";
import { loadServerTopData } from "@/lib/site/public-data";
import { DataUnavailable } from "@/components/site/data-unavailable";
import type { AffiliateLink, Service } from "@/lib/types/database";
import {
  Breadcrumb,
  PageValueProps,
} from "@/components/site/ui";

/** lib/site/cache.ts の PUBLIC_DATA_REVALIDATE_SECONDS と揃える（静的リテラル必須） */
export const revalidate = 300;

type Props = { params: Promise<{ categorySlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params;
  if (!hasSupabasePublicEnv() || isReservedPathSegment(categorySlug)) {
    return { title: "レンタルサーバー一覧" };
  }

  if (categorySlug === PRIMARY_CATEGORY_SLUG) {
    return buildPageMetadata("services");
  }

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("categories")
    .select("name")
    .eq("slug", categorySlug)
    .eq("is_published", true)
    .maybeSingle();
  return {
    title: data ? `${data.name}のサービス一覧` : "サービス一覧",
    alternates: { canonical: `/${categorySlug}/services` },
  };
}

export default async function CategoryServicesPage({ params }: Props) {
  const { categorySlug } = await params;
  if (isReservedPathSegment(categorySlug) || !hasSupabasePublicEnv()) {
    notFound();
  }

  const isServer = categorySlug === PRIMARY_CATEGORY_SLUG;

  if (isServer) {
    let data;
    let failed = false;
    try {
      data = await loadServerTopData(categorySlug);
    } catch {
      failed = true;
    }
    if (failed || !data) return <DataUnavailable />;
    const count = data.allCount > 0 ? data.allCount : 20;

    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Breadcrumb
          items={[
            { href: "/server", label: SITE_BRAND },
            { label: "レンタルサーバー一覧" },
          ]}
        />
        <h1 className="mt-3 text-[1.625rem] font-bold tracking-tight text-[var(--text-primary)] sm:text-[2rem]">
          {count}サービスの特徴と料金を一覧で確認
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--text-body)] sm:text-[15px]">
          料金・容量・機能・サポートを同じ基準で整理しています。気になるサービスは比較に追加できます。
        </p>
        <div className="mt-3">
          <PageValueProps
            items={[
              "特徴が分かる",
              "同じ基準で比較できる",
              "向いている人を確認できる",
            ]}
          />
        </div>

        {data.services.length === 0 ? (
          <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-10 text-center text-[var(--text-body)]">
            公開中のサービスはまだありません。
          </p>
        ) : (
          <ServicesListClient
            categorySlug={categorySlug}
            services={data.services}
            fields={data.comparisonFields}
          />
        )}
      </div>
    );
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

  const { data: services } = await supabase
    .from("services")
    .select(
      "id, category_id, name, slug, short_name, catchphrase, logo_url, thumbnail_url, official_url, primary_link_url, affiliate_url, status, is_published, is_featured, display_order, editor_score, recommended_uses, seo_title, seo_description, canonical_url, og_image_url, created_at, updated_at, affiliate_links(id, service_id, asp_name, program_name, official_url, affiliate_url, approval_status, is_primary, is_active)",
    )
    .eq("category_id", category.id)
    .eq("is_published", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumb
        items={[
          { href: "/server", label: SITE_BRAND },
          { href: categoryPath(category.slug), label: category.name },
          { label: "サービス一覧" },
        ]}
      />
      <h1 className="mt-3 text-[1.625rem] font-bold text-[var(--text-primary)] sm:text-[2rem]">
        {category.name}のサービス一覧
      </h1>
      <p className="mt-2 text-[var(--text-body)]">
        掲載サービスを一覧で確認できます。
      </p>

      {(services ?? []).length === 0 ? (
        <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-10 text-center text-[var(--text-body)]">
          公開中のサービスはまだありません。
        </p>
      ) : (
        <div className="mt-6 grid gap-[var(--card-gap)] sm:grid-cols-2 sm:gap-[var(--card-gap-md)] lg:grid-cols-3">
          {(services ?? []).map((service) => {
            const links =
              (service.affiliate_links as AffiliateLink[] | undefined) ?? [];
            return (
              <ServiceCard
                key={service.id}
                service={service as Service}
                categorySlug={category.slug}
                affiliateLinks={links}
                pageType="services"
                buttonLocation="service_card"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasSupabasePublicEnv } from "@/lib/env";
import { isReservedPathSegment } from "@/lib/links";
import { SITE_BRAND, PRIMARY_CATEGORY_SLUG } from "@/lib/site/brand";
import { buildPageMetadata } from "@/lib/site/seo";
import { loadServerTopData } from "@/lib/site/public-data";
import { getDefaultComparisonSlugs } from "@/lib/site/default-comparison-services";
import { ComparePageClient } from "@/components/site/compare/compare-page-client";
import { CompareTableNote } from "@/components/site/compare/compare-table-note";
import { CompareIntroStats } from "@/components/site/compare/compare-intro-stats";
import { DataUnavailable } from "@/components/site/data-unavailable";
import { Breadcrumb } from "@/components/site/ui";
import { buildCompareRows } from "@/lib/site/compare-rows";

/** searchParams 利用のためページ自体は dynamic になり得るが、DB は unstable_cache 済み */
export const revalidate = 300;

type Props = {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ slugs?: string; all?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params;
  if (categorySlug === PRIMARY_CATEGORY_SLUG) {
    return buildPageMetadata("compare");
  }
  return {
    title: "レンタルサーバー比較",
    description:
      "気になるレンタルサーバーを並べて、料金・容量・機能を比較できます。",
    alternates: { canonical: `/${categorySlug}/compare` },
    openGraph: {
      title: "レンタルサーバー比較",
      description:
        "気になるレンタルサーバーを並べて、料金・容量・機能を比較できます。",
      url: `/${categorySlug}/compare`,
      type: "website",
    },
  };
}

export default async function ComparePage({ params, searchParams }: Props) {
  const { categorySlug } = await params;
  const { slugs: slugsParam, all: allParam } = await searchParams;

  if (isReservedPathSegment(categorySlug) || !hasSupabasePublicEnv()) {
    notFound();
  }

  let data;
  let failed = false;
  try {
    data = await loadServerTopData(categorySlug);
  } catch {
    failed = true;
  }
  if (failed || !data) return <DataUnavailable />;

  const allPublishedSlugs = data.services.map((s) => s.service.slug);
  const slugList =
    allParam === "1"
      ? allPublishedSlugs
      : (slugsParam ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

  const serviceCount = data.allCount > 0 ? data.allCount : data.services.length;
  const fieldCount = Math.max(
    buildCompareRows(
      data.services.slice(0, Math.min(3, data.services.length)),
      data.comparisonFields,
    ).length,
    data.comparisonFields.length,
    1,
  );

  return (
    <div className="mx-auto max-w-[var(--container-max)] px-3 py-5 sm:px-6 sm:py-8">
      <Breadcrumb
        items={[
          { href: "/server", label: SITE_BRAND },
          { label: "比較" },
        ]}
      />
      <h1 className="mt-2 text-[1.375rem] font-bold tracking-tight text-[var(--text-primary)] sm:mt-3 sm:text-[1.75rem]">
        レンタルサーバー比較
      </h1>
      <p className="mt-1.5 text-[13px] leading-snug text-[var(--text-body)] sm:text-[14px]">
        料金・容量・機能をまとめて比較できます。複数プランがあるサービスは、プランを切り替えて確認できます。
        {serviceCount > 0 ? `（掲載${serviceCount}サービス）` : ""}
      </p>

      <CompareIntroStats serviceCount={serviceCount} fieldCount={fieldCount} />

      <CompareTableNote className="mt-2.5" />

      <ComparePageClient
        categorySlug={categorySlug}
        allServices={data.services.map((s) => ({
          slug: s.service.slug,
          name: s.service.name,
        }))}
        enriched={data.services}
        fields={data.comparisonFields}
        initialSlugs={slugList}
        defaultSlugs={getDefaultComparisonSlugs(data.services)}
      />
    </div>
  );
}

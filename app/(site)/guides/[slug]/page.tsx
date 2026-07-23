import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasSupabasePublicEnv } from "@/lib/env";
import {
  getAllGuideSlugs,
  getGuideBySlug,
} from "@/lib/guides/registry";
import { PRIMARY_CATEGORY_SLUG, SITE_BRAND } from "@/lib/site/brand";
import { getDefaultComparisonServices } from "@/lib/site/default-comparison-services";
import {
  loadServerTopData,
  type ServerTopData,
} from "@/lib/site/public-data";
import type { ComparisonField } from "@/lib/types/database";
import type { EnrichedService } from "@/lib/site/service-utils";
import { getSiteUrl } from "@/lib/site/seo";
import { GuideShell } from "@/components/site/guides/guide-shell";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return { title: "ガイド" };

  const path = `/guides/${guide.slug}`;
  const url = `${getSiteUrl()}${path}`;

  return {
    title: { absolute: guide.title },
    description: guide.description,
    alternates: { canonical: path },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url,
      siteName: SITE_BRAND,
      locale: "ja_JP",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.description,
    },
  };
}

export default async function GuideArticlePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  let services: EnrichedService[] = [];
  let compareServices: EnrichedService[] = [];
  let comparisonFields: ComparisonField[] = [];
  let allSlugs: string[] = [];

  if (hasSupabasePublicEnv()) {
    const data: ServerTopData | null =
      await loadServerTopData(PRIMARY_CATEGORY_SLUG);
    if (data) {
      services = data.services;
      compareServices =
        data.topComparisonServices.length > 0
          ? data.topComparisonServices
          : getDefaultComparisonServices(data.services);
      comparisonFields = data.comparisonFields;
      allSlugs = data.services.map((s) => s.service.slug);
    }
  }

  const Content = guide.Content;

  return (
    <GuideShell guide={guide}>
      <Content
        services={services}
        compareServices={compareServices}
        comparisonFields={comparisonFields}
        allSlugs={allSlugs}
      />
    </GuideShell>
  );
}

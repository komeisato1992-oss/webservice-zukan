import type { MetadataRoute } from "next";
import { hasSupabasePublicEnv } from "@/lib/env";
import { listDomainBeginnerArticleSlugs } from "@/lib/domain-articles/registry";
import { listGuides } from "@/lib/guides/registry";
import { PRIMARY_CATEGORY_SLUG } from "@/lib/site/brand";
import { DOMAIN_CATEGORY_SLUG } from "@/lib/site/domain-brand";
import { listDictionaryStaticSitemapPaths } from "@/lib/site/dictionary-static-pages";
import { PAGE_META, getSiteUrl } from "@/lib/site/seo";
import { createPublicClient } from "@/lib/supabase/public";
import {
  DEFAULT_SITE_HIDDEN_SLUGS,
  isPublicSiteService,
} from "@/lib/site/public-data";

/** ISR: Search Console 向けに定期更新 */
export const revalidate = 300;

/**
 * App Router 標準の MetadataRoute.Sitemap。
 * Next.js が /sitemap.xml を application/xml の XML として返す。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const now = new Date();

  const guideEntries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/guides`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...listGuides().map((guide) => ({
      url: `${siteUrl}/guides/${guide.slug}`,
      lastModified: new Date(guide.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...listDomainBeginnerArticleSlugs().map((slug) => ({
      url: `${siteUrl}/${DOMAIN_CATEGORY_SLUG}/articles/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}${PAGE_META.server.path}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}${PAGE_META.services.path}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}${PAGE_META.compare.path}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...listDictionaryStaticSitemapPaths().map((path) => ({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: path.endsWith("/about") || path.endsWith("/contact") ? 0.4 : 0.3,
    })),
    ...guideEntries,
  ];

  if (!hasSupabasePublicEnv()) {
    return staticEntries;
  }

  try {
    const supabase = createPublicClient();
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", PRIMARY_CATEGORY_SLUG)
      .eq("is_published", true)
      .maybeSingle();

    if (!category) return staticEntries;

    const withVisible = await supabase
      .from("services")
      .select("slug, updated_at")
      .eq("category_id", category.id)
      .eq("is_published", true)
      .eq("is_site_visible", true)
      .order("display_order", { ascending: true });

    const services = withVisible.error
      ? (
          await supabase
            .from("services")
            .select("slug, updated_at")
            .eq("category_id", category.id)
            .eq("is_published", true)
            .order("display_order", { ascending: true })
        ).data
      : withVisible.data;

    const visibleServices = (services ?? []).filter((service) =>
      withVisible.error
        ? !DEFAULT_SITE_HIDDEN_SLUGS.has(service.slug)
        : isPublicSiteService({
            is_published: true,
            is_site_visible: true,
            slug: service.slug,
          }),
    );

    const serviceEntries: MetadataRoute.Sitemap = visibleServices.map(
      (service) => ({
        url: `${siteUrl}/${PRIMARY_CATEGORY_SLUG}/services/${service.slug}`,
        lastModified: service.updated_at
          ? new Date(service.updated_at)
          : now,
        changeFrequency: "weekly",
        priority: 0.7,
      }),
    );

    return [...staticEntries, ...serviceEntries];
  } catch {
    return staticEntries;
  }
}

import type { MetadataRoute } from "next";
import { hasSupabasePublicEnv } from "@/lib/env";
import { listGuides } from "@/lib/guides/registry";
import { PRIMARY_CATEGORY_SLUG } from "@/lib/site/brand";
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
    {
      url: `${siteUrl}${PAGE_META.about.path}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}${PAGE_META.privacy.path}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}${PAGE_META.disclaimer.path}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}${PAGE_META.contact.path}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
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

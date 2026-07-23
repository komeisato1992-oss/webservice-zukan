import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import {
  PUBLIC_DATA_REVALIDATE_SECONDS,
  PUBLIC_SITE_CACHE_TAG,
} from "@/lib/site/cache";
import {
  CONTENT_TYPE_LABELS,
  type PublicContentCard,
} from "@/lib/contents/types";
import { getServiceDestinationLink } from "@/lib/services/get-service-destination-url";
import type { ManagedContentType } from "@/lib/types/database";

type ContentServiceJoin = {
  id: string;
  name: string;
  slug: string;
  is_published: boolean;
  official_url: string | null;
  affiliate_url?: string | null;
};

type ContentRow = {
  id: string;
  content_type: string;
  title: string;
  summary: string | null;
  service_id: string | null;
  source_url: string | null;
  published_at: string | null;
  expires_at: string | null;
  updated_at: string;
  services: ContentServiceJoin | ContentServiceJoin[] | null;
};

async function fetchPublishedContents(limit = 3): Promise<PublicContentCard[]> {
  const supabase = createPublicClient();
  const now = new Date().toISOString();

  const selectWithAffiliate =
    "id, content_type, title, summary, service_id, source_url, published_at, expires_at, updated_at, priority, services!managed_contents_service_id_fkey(id, name, slug, is_published, official_url, affiliate_url)";
  const selectLegacy =
    "id, content_type, title, summary, service_id, source_url, published_at, expires_at, updated_at, priority, services!managed_contents_service_id_fkey(id, name, slug, is_published, official_url)";

  const primary = await supabase
    .from("managed_contents")
    .select(selectWithAffiliate)
    .is("deleted_at", null)
    .eq("is_checked", true)
    .eq("status", "published")
    .not("priority", "is", null)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("priority", { ascending: true })
    .order("published_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit * 2);

  let rows: ContentRow[] | null = null;
  if (primary.error) {
    const legacy = await supabase
      .from("managed_contents")
      .select(selectLegacy)
      .is("deleted_at", null)
      .eq("is_checked", true)
      .eq("status", "published")
      .not("priority", "is", null)
      .or(`published_at.is.null,published_at.lte.${now}`)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("priority", { ascending: true })
      .order("published_at", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(limit * 2);
    if (legacy.error) {
      console.warn("[contents] fetchPublishedContents:", primary.error.message);
      return [];
    }
    rows = (legacy.data ?? []) as unknown as ContentRow[];
  } else {
    rows = (primary.data ?? []) as unknown as ContentRow[];
  }

  const cards: PublicContentCard[] = [];
  for (const row of rows) {
    const service = (
      Array.isArray(row.services) ? row.services[0] : row.services
    ) as ContentServiceJoin | null;
    if (row.service_id && service && !service.is_published) continue;

    const destination = getServiceDestinationLink({
      affiliate_url: service?.affiliate_url,
      official_url: service?.official_url,
    });
    const contentType = row.content_type as ManagedContentType;
    cards.push({
      id: row.id,
      contentType,
      contentTypeLabel: CONTENT_TYPE_LABELS[contentType] ?? contentType,
      title: row.title,
      summary: row.summary,
      serviceId: row.service_id,
      serviceName: service?.name ?? null,
      serviceSlug: service?.slug ?? null,
      officialUrl: destination?.href ?? null,
      isAffiliate: destination?.isAffiliate ?? false,
      sourceUrl: row.source_url,
      publishedAt: row.published_at,
      expiresAt: row.expires_at,
      updatedAt: row.updated_at,
    });
    if (cards.length >= limit) break;
  }
  return cards;
}

const getCachedPublishedContents = unstable_cache(
  fetchPublishedContents,
  ["published-managed-contents"],
  {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_SITE_CACHE_TAG],
  },
);

export const loadPublishedContents = cache(
  async (limit = 3): Promise<PublicContentCard[]> => {
    return getCachedPublishedContents(limit);
  },
);

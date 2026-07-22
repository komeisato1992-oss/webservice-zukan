import { findCatalogEntryBySlug } from "@/lib/scraping/catalog";
import { SCRAPER_PROVIDERS } from "@/lib/scraping/providers";
import type { ScraperProvider } from "@/lib/scraping/types";

export { isScrapingSupported, scrapingProviderLabel } from "@/lib/scraping/catalog";

export function getProviderBySlug(serviceSlug: string): ScraperProvider | null {
  const entry = findCatalogEntryBySlug(serviceSlug);
  if (!entry) return null;
  return SCRAPER_PROVIDERS.find((p) => p.id === entry.id) ?? null;
}

export function listRegisteredProviders(): {
  id: string;
  label: string;
  slugs: string[];
}[] {
  return SCRAPER_PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    slugs: p.supportedSlugs,
  }));
}

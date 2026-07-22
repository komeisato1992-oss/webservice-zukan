import "@/lib/scraping/engine/handlers";
import { SCRAPER_DEFINITIONS } from "@/lib/scraping/definitions";
import { definitionToProvider } from "@/lib/scraping/engine/to-provider";
import type { ScraperProvider } from "@/lib/scraping/types";

/**
 * 実スクレイパー実装の登録表。
 * 定義は definitions/、共通実行は engine/ が担当。
 * catalog.ts の id と一致させること。
 */
export const SCRAPER_PROVIDERS: ScraperProvider[] = SCRAPER_DEFINITIONS.map(
  definitionToProvider,
);

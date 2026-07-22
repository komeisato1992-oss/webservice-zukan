import { runScraperDefinition } from "@/lib/scraping/engine/run";
import type { ScraperDefinition } from "@/lib/scraping/engine/types";
import type { ScraperProvider } from "@/lib/scraping/types";

/** 定義オブジェクトから ScraperProvider を生成する */
export function definitionToProvider(
  definition: ScraperDefinition,
): ScraperProvider {
  return {
    id: definition.id,
    label: definition.label,
    supportedSlugs: [...definition.supportedSlugs],
    scrape: (ctx) => runScraperDefinition(definition, ctx),
  };
}

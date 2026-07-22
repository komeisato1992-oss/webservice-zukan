import { registerFullHandler } from "@/lib/scraping/engine/registry";
import { colorfulBoxProvider } from "@/lib/scraping/providers/colorfulbox";
import { conohaWingProvider } from "@/lib/scraping/providers/conoha-wing";
import { lolipopProvider } from "@/lib/scraping/providers/lolipop";
import { mixhostProvider } from "@/lib/scraping/providers/mixhost";
import { sakuraProvider } from "@/lib/scraping/providers/sakura";
import { shinServerProvider } from "@/lib/scraping/providers/shin-server";
import { xserverProvider } from "@/lib/scraping/providers/xserver";
import type { ScraperProvider } from "@/lib/scraping/types";

function wrapProvider(provider: ScraperProvider) {
  registerFullHandler(provider.id, async ({ officialUrl, serviceSlug }) => {
    const data = await provider.scrape({
      serviceId: "engine",
      serviceSlug,
      officialUrl,
    });
    return {
      plans: data.plans,
      comparisonValues: data.comparisonValues,
      sourceUrls: data.sourceUrls,
      warnings: data.warnings,
      pageText: data.pageText ?? null,
    };
  });
}

wrapProvider(xserverProvider);
wrapProvider(conohaWingProvider);
wrapProvider(shinServerProvider);
wrapProvider(lolipopProvider);
wrapProvider(mixhostProvider);
wrapProvider(sakuraProvider);
wrapProvider(colorfulBoxProvider);

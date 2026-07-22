import { runOfficialScraper } from "../lib/scraping/run-scraper";
import { SCRAPER_PROVIDER_CATALOG } from "../lib/scraping/catalog";
import { PHASE2_SHELL_SERVICES } from "../lib/services/phase2-shell-services";
import { isScrapingSupported } from "../lib/scraping/catalog";

const TARGETS = [
  "webarena-indigo",
  "xrea",
  "star-server",
  "ablenet",
  "iclusta",
  "zenlogic",
  "futoka",
] as const;

async function main() {
  const supported = PHASE2_SHELL_SERVICES.filter((s) =>
    isScrapingSupported(s.slug),
  ).length;
  console.error(`bulk-supported count: ${supported}`);

  const results = [];
  for (const slug of TARGETS) {
    const shell = PHASE2_SHELL_SERVICES.find((s) => s.slug === slug);
    const cat = SCRAPER_PROVIDER_CATALOG.find((c) => c.slugs.includes(slug));
    if (!shell || !cat) {
      results.push({ slug, ok: false, error: "missing catalog/shell" });
      continue;
    }
    console.error(`\n======== ${slug} ========`);
    const result = await runOfficialScraper({
      serviceId: `test-${slug}`,
      serviceSlug: slug,
      officialUrl: shell.officialUrl,
    });
    results.push({
      slug,
      ok: result.ok,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      durationMs: result.durationMs,
      plans: result.data?.plans.map((p) => ({
        name: p.name.value,
        regular: p.regularMonthlyPrice.value,
        storage: [p.storageValue.value, p.storageUnit.value],
        initial: p.initialFee.value,
        period: p.billingPeriod.value,
      })),
      comparison: result.data?.comparisonValues.map((c) => ({
        slug: c.fieldSlug,
        value: c.value,
        status: c.status,
      })),
      warnings: result.data?.warnings,
    });
  }

  console.log(JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error("FAILED:", failed.map((f) => f.slug).join(", "));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

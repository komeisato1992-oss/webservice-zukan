import { runOfficialScraper } from "../lib/scraping/run-scraper";

async function main() {
  const result = await runOfficialScraper({
    serviceId: "test-lolipop",
    serviceSlug: "lolipop",
    officialUrl: "https://lolipop.jp/",
  });
  console.log(
    JSON.stringify(
      {
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
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { runOfficialScraper } from "../lib/scraping/run-scraper";

async function main() {
  const result = await runOfficialScraper({
    serviceId: "7f206242-ff44-48d8-acec-ce8da03e39b7",
    serviceSlug: "xserver",
    officialUrl: "https://www.xserver.ne.jp/",
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
          campaignStatus: p.campaignMonthlyPrice.status,
          effective: {
            status: p.effectiveMonthlyPrice.status,
            value: p.effectiveMonthlyPrice.value,
          },
          storage: [p.storageValue.value, p.storageUnit.value],
          initial: p.initialFee.value,
          period: p.billingPeriod.value,
        })),
        comparison: result.data?.comparisonValues.map((c) => ({
          slug: c.fieldSlug,
          value: c.value,
          status: c.status,
          confidence: c.confidence,
          inferred: c.inferred,
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

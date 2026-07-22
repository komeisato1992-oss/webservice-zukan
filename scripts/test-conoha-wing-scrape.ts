import { runOfficialScraper } from "../lib/scraping/run-scraper";

async function main() {
  const result = await runOfficialScraper({
    serviceId: "test-conoha-wing",
    serviceSlug: "conoha-wing",
    officialUrl: "https://www.conoha.jp/",
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
          slugHint: p.slugHint,
          regular: {
            value: p.regularMonthlyPrice.value,
            status: p.regularMonthlyPrice.status,
            confidence: p.regularMonthlyPrice.confidence,
          },
          campaignStatus: p.campaignMonthlyPrice.status,
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
        sourceUrls: result.data?.sourceUrls,
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

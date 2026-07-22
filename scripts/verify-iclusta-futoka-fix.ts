import { runOfficialScraper } from "../lib/scraping/run-scraper";

async function main() {
  console.log("--- iclusta with dead URL (should rewrite) ---");
  const dead = await runOfficialScraper({
    serviceId: "probe-iclusta-dead",
    serviceSlug: "iclusta",
    officialUrl: "https://shared-server.net/",
  });
  console.log(
    JSON.stringify(
      {
        ok: dead.ok,
        shortReason: dead.shortReason,
        errorCode: dead.errorCode,
        errorMessage: dead.errorMessage,
        plans: dead.data?.plans?.map((p) => ({
          name: p.name.value,
          price: p.effectiveMonthlyPrice.value ?? p.regularMonthlyPrice.value,
        })),
        warnings: dead.data?.warnings,
        sourceUrls: dead.data?.sourceUrls,
        durationMs: dead.durationMs,
      },
      null,
      2,
    ),
  );

  console.log("--- iclusta with gmo URL ---");
  const gmo = await runOfficialScraper({
    serviceId: "probe-iclusta-gmo",
    serviceSlug: "iclusta",
    officialUrl: "https://shared.gmocloud.com/",
  });
  console.log(
    JSON.stringify(
      {
        ok: gmo.ok,
        plans: gmo.data?.plans?.map((p) => p.name.value),
        durationMs: gmo.durationMs,
      },
      null,
      2,
    ),
  );

  console.log("--- futoka (expect safe failure) ---");
  const futoka = await runOfficialScraper({
    serviceId: "probe-futoka",
    serviceSlug: "futoka",
    officialUrl: "https://www.futoka.jp/",
  });
  console.log(
    JSON.stringify(
      {
        ok: futoka.ok,
        shortReason: futoka.shortReason,
        errorCode: futoka.errorCode,
        errorMessage: futoka.errorMessage,
        detail: futoka.log.errorDetail,
        durationMs: futoka.durationMs,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

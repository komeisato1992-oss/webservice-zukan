/**
 * 20サービスのサポート候補取得スモーク（公開DBへは書き込まない）
 */
import { PHASE2_SHELL_SERVICES } from "../lib/services/phase2-shell-services";
import { runOfficialScraper } from "../lib/scraping/run-scraper";
import { isScrapingSupported } from "../lib/scraping/catalog";
import { SUPPORT_FIELD_SLUGS } from "../lib/site/support";

const SUPPORT_SLUGS = new Set<string>(Object.values(SUPPORT_FIELD_SLUGS));

async function main() {
  const targets = PHASE2_SHELL_SERVICES.filter((s) =>
    isScrapingSupported(s.slug),
  );
  console.log(`targets=${targets.length}`);

  let scrapeOk = 0;
  let scrapeFail = 0;
  let candidateTotal = 0;
  let unknownSupport = 0;
  const perService: Array<Record<string, unknown>> = [];

  for (const s of targets) {
    const r = await runOfficialScraper({
      serviceId: `support-smoke-${s.slug}`,
      serviceSlug: s.slug,
      officialUrl: s.officialUrl,
    });

    if (r.ok) scrapeOk += 1;
    else scrapeFail += 1;

    const supportCandidates = (r.data?.comparisonValues ?? []).filter(
      (c) => SUPPORT_SLUGS.has(c.fieldSlug) && c.status === "found",
    );
    candidateTotal += supportCandidates.length;

    const phone = supportCandidates.find(
      (c) => c.fieldSlug === SUPPORT_FIELD_SLUGS.phone,
    );
    const email = supportCandidates.find(
      (c) => c.fieldSlug === SUPPORT_FIELD_SLUGS.email,
    );
    const chat = supportCandidates.find(
      (c) => c.fieldSlug === SUPPORT_FIELD_SLUGS.chat,
    );

    if (!phone && !email && !chat) unknownSupport += 1;

    perService.push({
      slug: s.slug,
      scrapeOk: r.ok,
      shortReason: r.shortReason,
      supportCandidates: supportCandidates.length,
      phone: phone?.value ?? null,
      email: email?.value ?? null,
      chat: chat?.value ?? null,
      durationMs: r.durationMs,
    });

    console.log(
      `${r.ok ? "OK" : "NG"} ${s.slug} support=${supportCandidates.length} phone=${phone?.value ?? "?"} email=${email?.value ?? "?"} chat=${chat?.value ?? "?"} ${r.shortReason ?? ""}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        scrapeSuccess: scrapeOk,
        scrapeFailed: scrapeFail,
        supportCandidateTotal: candidateTotal,
        servicesWithNoChannelCandidate: unknownSupport,
        perService,
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

/**
 * 全対応 Provider の単体取得スモーク（公開データへは書き込まない）
 */
import { PHASE2_SHELL_SERVICES } from "../lib/services/phase2-shell-services";
import { runOfficialScraper } from "../lib/scraping/run-scraper";
import { isScrapingSupported } from "../lib/scraping/catalog";

async function main() {
  const targets = PHASE2_SHELL_SERVICES.filter((s) =>
    isScrapingSupported(s.slug),
  );
  console.log(`targets=${targets.length}`);

  const results: Array<{
    slug: string;
    ok: boolean;
    shortReason: string | null;
    durationMs: number;
  }> = [];

  for (const s of targets) {
    const started = Date.now();
    const r = await runOfficialScraper({
      serviceId: `smoke-${s.slug}`,
      serviceSlug: s.slug,
      officialUrl: s.officialUrl,
    });
    results.push({
      slug: s.slug,
      ok: r.ok,
      shortReason: r.shortReason,
      durationMs: Date.now() - started,
    });
    console.log(
      `${r.ok ? "OK" : "NG"} ${s.slug} ${r.durationMs}ms ${r.shortReason ?? ""}`,
    );
  }

  const success = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(
    JSON.stringify(
      {
        success,
        failed: failed.length,
        failedSlugs: failed.map((f) => ({
          slug: f.slug,
          shortReason: f.shortReason,
        })),
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

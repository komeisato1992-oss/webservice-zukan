import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SITE_URL ?? "http://localhost:3001";
const OUT = path.join(process.cwd(), "tmp/compare-hover-check");

async function shot(page: import("playwright").Page, name: string) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 375] as const) {
      const page = await browser.newPage({
        viewport: { width, height: width >= 1024 ? 1000 : 860 },
      });
      await page.goto(`${BASE}/server`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(600);

      const section = page.locator("#compare-categories");
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);

      // サービス列をホバーして横スクロール
      const serviceCell = page.locator("#compare-categories td.compare-service-col").nth(1);
      if (await serviceCell.count()) {
        await serviceCell.hover({ force: true });
        await page.waitForTimeout(200);
      }
      const scroll = page.locator("#compare-categories .comparison-table-scroll").first();
      if (await scroll.count()) {
        await scroll.evaluate((el) => {
          el.scrollLeft = 120;
        });
        await page.waitForTimeout(200);
      }
      await shot(page, `hover-scroll-${width}.png`);

      // 無料お試し・サポートに⭐が出ていないこと
      const html = await page.content();
      const trialStar =
        /無料お試し[\s\S]{0,400}⭐/.test(html) ||
        /free-trial[\s\S]{0,200}⭐/.test(html);
      const supportStar = /サポート[\s\S]{0,300}⭐最大|サポート[\s\S]{0,300}⭐高評価/.test(
        html,
      );
      console.log(
        JSON.stringify({
          width,
          trialHasStarNearby: trialStar,
          supportBestStar: supportStar,
          hasTrialLabel: html.includes("無料お試し"),
          hasSupport: html.includes("サポート"),
        }),
      );

      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

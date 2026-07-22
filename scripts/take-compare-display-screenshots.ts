import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SITE_URL ?? "http://localhost:3001";
const OUT = path.join(process.cwd(), "tmp/compare-display-check");
const WIDTHS = [1440, 1024, 430, 390, 375];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of WIDTHS) {
      const page = await browser.newPage({
        viewport: { width, height: width >= 1024 ? 1100 : 900 },
      });
      await page.goto(`${BASE}/server`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(800);

      await page.locator("h2", { hasText: "人気3社の比較" }).first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await page.screenshot({
        path: path.join(OUT, `hero-compare-${width}.png`),
        fullPage: false,
      });

      const section = page.locator("#compare-categories");
      if (await section.count()) {
        await section.scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        await section.screenshot({
          path: path.join(OUT, `popular-compare-${width}.png`),
        });
      }

      await page.close();
      console.log("wrote", width);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

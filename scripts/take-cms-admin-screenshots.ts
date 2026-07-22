/**
 * Mobile admin CMS viewport smoke screenshots (375 / 390 / 430).
 * Requires: npm run dev on :3001 and optional ADMIN_EMAIL / ADMIN_PASSWORD.
 */
import { chromium, type Page } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3001";
const OUT = join(process.cwd(), "tmp/cms-admin-screenshots");
const WIDTHS = [375, 390, 430] as const;

async function loginIfNeeded(page: Page) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  await page.goto(`${BASE}/admin/services`, { waitUntil: "networkidle" });
  if (!page.url().includes("/admin/login")) return true;
  if (!email || !password) {
    console.warn("ADMIN_EMAIL/PASSWORD not set; capturing login shell only");
    return false;
  }
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 15000 });
  return true;
}

async function shot(page: Page, name: string, width: number) {
  await page.setViewportSize({ width, height: 844 });
  await page.waitForTimeout(400);
  const path = join(OUT, `${name}-${width}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log("wrote", path);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const loggedIn = await loginIfNeeded(page);

  for (const width of WIDTHS) {
    await shot(page, "services", width);
    if (!loggedIn) continue;

    const first = page.locator('a[href^="/admin/services/"]').first();
    if (await first.count()) {
      await first.click();
      await page.waitForLoadState("networkidle");
      await shot(page, "service-edit", width);

      // Check fixed action bar doesn't cover inputs: scroll to middle
      await page.evaluate(() => window.scrollTo(0, 200));
      await shot(page, "service-edit-scrolled", width);
    }

    await page.goto(`${BASE}/admin/comparison-fields`, {
      waitUntil: "networkidle",
    });
    await shot(page, "comparison-fields", width);

    await page.goto(`${BASE}/admin/scraping`, { waitUntil: "networkidle" });
    await shot(page, "scraping", width);

    await page.goto(`${BASE}/admin/spreadsheet`, { waitUntil: "networkidle" });
    await shot(page, "spreadsheet", width);

    await page.goto(`${BASE}/admin/history`, { waitUntil: "networkidle" });
    await shot(page, "history", width);
  }

  // Public site still works (draft not required)
  for (const width of WIDTHS) {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await shot(page, "public-home", width);
  }

  await browser.close();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

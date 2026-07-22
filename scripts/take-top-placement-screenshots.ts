import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "tmp/redesign-screenshots");
const EMAIL = process.env.ADMIN_EMAIL ?? "";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "";

async function shot(
  page: import("playwright").Page,
  url: string,
  file: string,
) {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUT, file),
    fullPage: false,
  });
  console.log("saved", file);
}

async function loginIfPossible(page: import("playwright").Page) {
  if (!EMAIL || !PASSWORD) {
    console.log("ADMIN_EMAIL/ADMIN_PASSWORD not set — capturing login redirect");
    return false;
  }
  await page.goto(`${BASE}/admin/login`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.fill('input[name="email"], input[type="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 30000 });
  return true;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const desktop = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await shot(desktop, "/server", "desktop-top-placement-home.png");
  await desktop.goto(`${BASE}/server`, { waitUntil: "networkidle", timeout: 90000 });
  await desktop.locator("#compare-categories").scrollIntoViewIfNeeded();
  await desktop.waitForTimeout(400);
  await desktop.screenshot({
    path: path.join(OUT, "desktop-top-comparison-section.png"),
  });
  console.log("saved desktop-top-comparison-section.png");

  await loginIfPossible(desktop);
  await shot(desktop, "/admin/services", "desktop-admin-services-top-placement.png");
  await desktop.close();

  const mobile = await browser.newPage({ ...devices["iPhone 13"] });
  await shot(mobile, "/server", "mobile-top-placement-home.png");
  await mobile.goto(`${BASE}/server`, { waitUntil: "networkidle", timeout: 90000 });
  await mobile.locator("#compare-categories").scrollIntoViewIfNeeded();
  await mobile.waitForTimeout(400);
  await mobile.screenshot({
    path: path.join(OUT, "mobile-top-comparison-section.png"),
  });
  console.log("saved mobile-top-comparison-section.png");

  await loginIfPossible(mobile);
  await shot(mobile, "/admin/services", "mobile-admin-services-top-placement.png");
  await mobile.close();

  await browser.close();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

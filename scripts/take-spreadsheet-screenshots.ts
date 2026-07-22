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
  opts?: { fullPage?: boolean; waitMs?: number },
) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  if (opts?.waitMs) await page.waitForTimeout(opts.waitMs);
  await page.screenshot({
    path: path.join(OUT, file),
    fullPage: opts?.fullPage ?? true,
  });
  console.log("saved", file);
}

async function loginIfPossible(page: import("playwright").Page) {
  if (!EMAIL || !PASSWORD) {
    console.log("ADMIN_EMAIL/ADMIN_PASSWORD not set — capturing login redirect");
    return false;
  }
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForURL(/\/admin(?!\/login)/, { timeout: 20000 }).catch(() => null),
  ]);
  return !page.url().includes("/admin/login");
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const desktop = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const loggedIn = await loginIfPossible(desktop);
  await shot(
    desktop,
    `${BASE}/admin/spreadsheet`,
    loggedIn ? "desktop-admin-spreadsheet.png" : "desktop-admin-spreadsheet-login.png",
    { waitMs: 500 },
  );
  await shot(desktop, `${BASE}/server`, "desktop-home-after-spreadsheet.png", {
    waitMs: 400,
    fullPage: false,
  });
  await desktop.close();

  const mobile = await browser.newPage({ ...devices["iPhone 13"] });
  if (EMAIL && PASSWORD) {
    await loginIfPossible(mobile);
  }
  await shot(
    mobile,
    `${BASE}/admin/spreadsheet`,
    EMAIL && PASSWORD
      ? "mobile-admin-spreadsheet.png"
      : "mobile-admin-spreadsheet-login.png",
    { waitMs: 500 },
  );
  await mobile.close();

  await browser.close();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

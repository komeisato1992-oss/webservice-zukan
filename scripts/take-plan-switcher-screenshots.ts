import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "tmp/redesign-screenshots");

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
    fullPage: opts?.fullPage ?? false,
  });
  console.log("saved", file);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const desktop = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  await shot(desktop, `${BASE}/server`, "desktop-home.png");
  await shot(desktop, `${BASE}/server/compare`, "desktop-compare.png", {
    waitMs: 800,
  });
  await shot(desktop, `${BASE}/server#compare-categories`, "desktop-popular-compare.png", {
    waitMs: 600,
  });
  await shot(desktop, `${BASE}/admin/login`, "admin-login.png");
  await desktop.close();

  const mobile = await browser.newPage({
    ...devices["iPhone 13"],
  });
  await shot(mobile, `${BASE}/server`, "mobile-home.png");
  await shot(mobile, `${BASE}/server/compare`, "mobile-compare.png", {
    waitMs: 800,
  });
  await shot(mobile, `${BASE}/server#compare-categories`, "mobile-popular-compare.png", {
    waitMs: 600,
  });
  await mobile.close();

  await browser.close();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

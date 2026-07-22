import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "tmp/ui-final-screenshots");

const WIDTHS = [1920, 1440, 1280, 1024, 768, 430, 390, 375, 360] as const;

async function shot(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>,
  url: string,
  file: string,
  fullPage = false,
) {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(OUT, file),
    fullPage,
  });
  console.log("wrote", file);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  for (const width of WIDTHS) {
    const height = width >= 1024 ? 900 : 812;
    const page = await browser.newPage({ viewport: { width, height } });
    await shot(page, "/server", `top-${width}.png`);
    await shot(page, "/server/compare?all=1", `compare-${width}.png`);
    await shot(page, "/server/services", `services-${width}.png`);
    await page.close();
  }

  const mobile = await browser.newPage({ ...devices["iPhone 13"] });
  await shot(mobile, "/server", "mobile-top.png", true);
  await shot(mobile, "/server/compare?all=1", "mobile-compare.png", true);
  await shot(mobile, "/server/services", "mobile-services.png", true);
  await mobile.close();

  await browser.close();
  console.log("done ->", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

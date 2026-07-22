import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "tmp/redesign-screenshots");

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const desktop = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  await desktop.goto(`${BASE}/server`, { waitUntil: "networkidle", timeout: 60000 });
  await desktop.waitForTimeout(600);
  await desktop.screenshot({
    path: path.join(OUT, "desktop-home.png"),
    fullPage: false,
  });
  console.log("saved desktop-home.png");
  await desktop.close();

  const mobile = await browser.newPage({ ...devices["iPhone 13"] });
  await mobile.goto(`${BASE}/server`, { waitUntil: "networkidle", timeout: 60000 });
  await mobile.waitForTimeout(600);
  await mobile.screenshot({
    path: path.join(OUT, "mobile-home.png"),
    fullPage: false,
  });
  console.log("saved mobile-home.png");
  await mobile.close();

  await browser.close();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

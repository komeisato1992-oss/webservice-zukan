import { chromium } from "playwright";
import { isScrapingSupported } from "../lib/scraping/catalog";
import { PHASE2_SHELL_SERVICES } from "../lib/services/phase2-shell-services";

async function main() {
  const supported = PHASE2_SHELL_SERVICES.filter((s) =>
    isScrapingSupported(s.slug),
  ).map((s) => `${s.name} (${s.slug})`);
  const unsupported = PHASE2_SHELL_SERVICES.filter(
    (s) => !isScrapingSupported(s.slug),
  ).map((s) => `${s.name} (${s.slug})`);
  console.log(
    JSON.stringify(
      { supported, unsupportedCount: unsupported.length, unsupported },
      null,
      2,
    ),
  );

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

  await page.goto("http://localhost:3000/server/services", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(1500);
  const detailButtons = await page.getByText("詳細を見る").count();
  console.log("detail_buttons", detailButtons);
  await page.screenshot({
    path: "tmp-screenshots/public-services-20.png",
    fullPage: true,
  });

  await page.goto("http://localhost:3000/admin/services", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: "tmp-screenshots/admin-services.png",
    fullPage: true,
  });

  await browser.close();
  console.log("screenshots_ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * 比較ページ: 選択同期・デフォルト・ピンのスモーク
 * SCREENSHOT_BASE_URL=http://localhost:3001 npx tsx scripts/verify-compare-selection.ts
 */
import { chromium, devices } from "playwright";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3001";

function parseCount(text: string | null): number {
  const m = text?.match(/（\s*(\d+)\s*\/\s*(\d+)\s*）/);
  return m ? Number(m[1]) : -1;
}

async function verifyWidth(width: number, height: number, label?: string) {
  const tag = label ?? String(width);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height } });
  const errors: string[] = [];

  await page.goto(`${BASE}/server/compare`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.evaluate(() => {
    localStorage.removeItem("zukan-compare-v1");
    localStorage.removeItem("zukan-compare-pins-v1");
    localStorage.removeItem("zukan-compare-empty-intent-v1");
  });
  await page.reload({ waitUntil: "networkidle", timeout: 90000 });

  const countLoc = page.locator("text=比較対象").first();
  await countLoc.waitFor({ timeout: 30000 });
  await page.waitForFunction(() => {
    const el = Array.from(document.querySelectorAll("p, span, div")).find((n) =>
      (n.textContent || "").includes("比較対象（"),
    );
    const t = el?.textContent || "";
    const m = t.match(/（\s*(\d+)\s*\//);
    return m ? Number(m[1]) > 0 : false;
  }, { timeout: 15000 }).catch(() => null);

  let selected = parseCount(await countLoc.textContent());
  if (selected < 1) {
    errors.push(`${tag}: default selection expected >0, got count=${selected}`);
  }

  const clearSpan = page
    .locator("span[role='button']")
    .filter({ hasText: /^クリア$/ })
    .first();
  if (await clearSpan.count()) {
    await clearSpan.click();
    await page.waitForTimeout(400);
  }

  selected = parseCount(await countLoc.textContent());
  if (selected !== 0) {
    errors.push(`${tag}: after clear expected 0, got ${selected}`);
  }

  const options = page.locator('[role="option"]');
  await options.first().waitFor({ timeout: 10000 });
  await options.nth(0).click();
  await page.waitForTimeout(250);
  await options.nth(1).click();
  await page.waitForTimeout(250);
  await options.nth(2).click();
  await page.waitForTimeout(400);

  selected = parseCount(await countLoc.textContent());
  if (selected !== 3) {
    errors.push(`${tag}: expected 3 selected after clicks, got ${selected}`);
  }

  const selectedOpts = await page.locator('[role="option"][aria-selected="true"]').count();
  if (selectedOpts !== 3) {
    errors.push(`${tag}: aria-selected true count=${selectedOpts}, expected 3`);
  }

  const headerCols = await page.locator(".compare-app thead th").count();
  if (headerCols < 4) {
    errors.push(`${tag}: table columns too few (${headerCols})`);
  }

  await options.nth(1).click();
  await page.waitForTimeout(300);
  selected = parseCount(await countLoc.textContent());
  if (selected !== 2) {
    errors.push(`${tag}: expected 2 after deselect, got ${selected}`);
  }

  const pin = page.locator('button[aria-label*="左側に固定"]').first();
  if (await pin.count()) {
    await pin.click();
    await page.waitForTimeout(250);
    const unpin = page.locator('button[aria-label*="固定を解除"]').first();
    if (!(await unpin.count())) {
      errors.push(`${tag}: pin did not activate`);
    } else {
      // reload restore
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      if (!(await page.locator('button[aria-label*="固定を解除"]').count())) {
        errors.push(`${tag}: pin not restored after reload`);
      }
      const afterReload = parseCount(
        await page.locator("text=比較対象").first().textContent(),
      );
      if (afterReload !== 2) {
        errors.push(`${tag}: selection not restored after reload (${afterReload})`);
      }
    }
  } else {
    errors.push(`${tag}: pin button missing`);
  }

  await browser.close();
  return { tag, errors };
}

async function main() {
  const results = [];
  for (const [w, h] of [
    [1440, 900],
    [1024, 800],
    [430, 812],
    [390, 844],
    [375, 812],
  ] as const) {
    results.push(await verifyWidth(w, h));
  }

  {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ...devices["iPhone 13"] });
    const page = await context.newPage();
    const errors: string[] = [];
    await page.goto(`${BASE}/server/compare`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.evaluate(() => {
      localStorage.removeItem("zukan-compare-v1");
      localStorage.removeItem("zukan-compare-pins-v1");
      localStorage.removeItem("zukan-compare-empty-intent-v1");
    });
    await page.reload({ waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(1000);
    const clearSpan = page.locator("span[role='button']").filter({ hasText: /^クリア$/ }).first();
    if (await clearSpan.count()) await clearSpan.tap();
    await page.waitForTimeout(300);
    await page.locator('[role="option"]').first().tap();
    await page.waitForTimeout(400);
    const after = parseCount(
      await page.locator("text=比較対象").first().textContent(),
    );
    if (after !== 1) errors.push(`iPhone: expected 1, got ${after}`);
    await browser.close();
    results.push({ tag: "iPhone13", errors });
  }

  let failed = 0;
  for (const r of results) {
    if (r.errors.length) {
      failed += r.errors.length;
      console.log("FAIL", r.tag, r.errors);
    } else {
      console.log("OK", r.tag);
    }
  }
  if (failed) {
    console.error(`failed: ${failed}`);
    process.exit(1);
  }
  console.log("all compare selection checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

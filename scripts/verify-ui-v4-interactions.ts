/**
 * Ver.4 操作スモーク: FAQ / 条件カード / 並び替え / プラン名重複
 * SCREENSHOT_BASE_URL=http://localhost:3001 npx tsx scripts/verify-ui-v4-interactions.ts
 */
import { chromium, devices } from "playwright";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3001";

async function verify(width: number, height: number, label: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`${label} pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${label} console: ${msg.text()}`);
  });

  await page.goto(`${BASE}/server`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(800);

  // FAQ
  const faqBtn = page.locator("[data-faq-accordion] button").first();
  await faqBtn.scrollIntoViewIfNeeded();
  await faqBtn.click();
  await page.waitForTimeout(200);
  const expanded = await faqBtn.getAttribute("aria-expanded");
  if (expanded !== "true") errors.push(`${label}: FAQ did not open`);
  await faqBtn.click();
  await page.waitForTimeout(200);
  if ((await faqBtn.getAttribute("aria-expanded")) !== "false") {
    errors.push(`${label}: FAQ did not close`);
  }

  // Purpose card
  const purposeCard = page.locator("#purpose-picker button[aria-pressed]").first();
  await purposeCard.scrollIntoViewIfNeeded();
  await purposeCard.click();
  await page.waitForTimeout(600);
  const pressed = await purposeCard.getAttribute("aria-pressed");
  if (pressed !== "true") errors.push(`${label}: purpose card not active`);
  const ranking = page.locator("#purpose-picker h3").first();
  if (!(await ranking.isVisible().catch(() => false))) {
    errors.push(`${label}: ranking not visible after purpose tap`);
  }

  // Sort metric cell
  const metric = page.locator(".compare-label-cell [role='button']").first();
  if (await metric.count()) {
    await metric.scrollIntoViewIfNeeded();
    await metric.click();
    await page.waitForTimeout(200);
  }

  // Plan name duplication check on popular table headers
  const headers = page.locator("thead .compare-header-cell");
  const headerCount = await headers.count();
  for (let i = 1; i < Math.min(headerCount, 4); i++) {
    const text = ((await headers.nth(i).innerText()) || "").replace(/\s+/g, "\n");
    const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
    const planLines = lines.filter((l) => /プラン$/.test(l) || l === "スタンダード" || l === "ベーシック");
    // 生の「スタンダード」と「スタンダードプラン」が同居していないこと
    if (planLines.includes("スタンダード") && planLines.some((l) => l.includes("スタンダードプラン"))) {
      errors.push(`${label}: duplicate plan names in header: ${lines.join(" | ")}`);
    }
  }

  await browser.close();
  return { label, errors };
}

async function main() {
  const results = [];
  for (const [w, h] of [
    [1440, 900],
    [1024, 800],
    [430, 812],
    [390, 844],
    [375, 812],
    [360, 740],
  ] as const) {
    results.push(await verify(w, h, `${w}x${h}`));
  }

  // iPhone-like
  {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ...devices["iPhone 13"] });
    const page = await context.newPage();
    const errors: string[] = [];
    await page.goto(`${BASE}/server`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(800);
    const faqBtn = page.locator("[data-faq-accordion] button").first();
    await faqBtn.scrollIntoViewIfNeeded();
    await faqBtn.tap();
    await page.waitForTimeout(250);
    if ((await faqBtn.getAttribute("aria-expanded")) !== "true") {
      errors.push("iPhone: FAQ tap failed");
    }
    const purposeCard = page.locator("#purpose-picker button[aria-pressed]").first();
    await purposeCard.scrollIntoViewIfNeeded();
    await purposeCard.tap();
    await page.waitForTimeout(700);
    if ((await purposeCard.getAttribute("aria-pressed")) !== "true") {
      errors.push("iPhone: purpose tap failed");
    }
    await browser.close();
    results.push({ label: "iPhone13", errors });
  }

  let failed = 0;
  for (const r of results) {
    if (r.errors.length) {
      failed += r.errors.length;
      console.log("FAIL", r.label, r.errors);
    } else {
      console.log("OK", r.label);
    }
  }
  if (failed) {
    console.error(`failed checks: ${failed}`);
    process.exit(1);
  }
  console.log("all interaction checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

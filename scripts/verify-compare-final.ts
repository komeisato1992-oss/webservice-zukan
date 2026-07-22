import { chromium } from "playwright";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3001";

async function main() {
  const browser = await chromium.launch({ headless: true });

  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await page.addInitScript(() => {
    localStorage.removeItem("zukan-compare-pins-v1");
  });
  await page.goto(
    `${BASE}/server/compare?slugs=xserver,conoha-wing,lolipop,sakura`,
    { waitUntil: "networkidle", timeout: 90000 },
  );
  await page.waitForTimeout(1200);

  const headerBtns = page.locator("#compare-page-table thead button");
  const n = await headerBtns.count();
  console.log("headerBtnCount", n);
  if (n > 0) {
    console.log("firstHeaderBtn", await headerBtns.first().getAttribute("aria-label"));
    await headerBtns.first().click();
    await page.waitForTimeout(400);
    console.log(
      "afterPin",
      await page.evaluate(() => ({
        fixed: document.body.innerText.includes("固定中"),
        pressed:
          document.querySelector(
            "#compare-page-table thead button[aria-pressed=true]",
          ) !== null,
      })),
    );
  }

  const metric = page
    .locator("#compare-page-table .compare-label-cell [role=button]")
    .first();
  await metric.click();
  await page.waitForTimeout(300);
  console.log("sortOk", true);

  console.log(
    "visibility",
    await page.evaluate(() => {
      const app = document.querySelector("#compare-page-table")!;
      const ths = Array.from(app.querySelectorAll("thead th")).slice(1);
      const ar = app.getBoundingClientRect();
      return {
        cols: ths.length,
        fully: ths.filter((th) => {
          const r = th.getBoundingClientRect();
          return r.left >= ar.left - 1 && r.right <= ar.right + 1;
        }).length,
        halfPlus: ths.filter((th) => {
          const r = th.getBoundingClientRect();
          const o =
            Math.min(r.right, ar.right) - Math.max(r.left, ar.left);
          return o >= r.width * 0.5;
        }).length,
      };
    }),
  );

  await page.goto(`${BASE}/server`, {
    waitUntil: "networkidle",
    timeout: 90000,
  });
  await page.waitForTimeout(700);
  console.log(
    "sticky",
    await page.evaluate(() => {
      const app = document.querySelector(".comparison-table-shell")!;
      const appTop = app.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, appTop - 60);
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          const cat = document.querySelector(
            "[aria-label=おすすめ比較カテゴリ]",
          )!;
          const corner = document.querySelector(
            ".compare-sticky-corner",
          ) as HTMLElement;
          const catR = cat.getBoundingClientRect();
          const midX = corner.getBoundingClientRect().left + 12;
          const y = catR.bottom - 3;
          const el =
            y > 0 && y < innerHeight
              ? document.elementFromPoint(midX, y)
              : null;
          resolve({
            covering: !!(
              el &&
              el.closest(".comparison-table-shell") &&
              catR.bottom > 0
            ),
            maxH: getComputedStyle(
              app.querySelector(".comparison-table-scroll")!,
            ).maxHeight,
            shellZ: getComputedStyle(app).zIndex,
            cornerZ: getComputedStyle(corner).zIndex,
          });
        });
      });
    }),
  );

  for (const w of [375, 390, 430]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(`${BASE}/server`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(500);
    await page.evaluate(() =>
      document.getElementById("compare-categories")?.scrollIntoView(),
    );
    await page.waitForTimeout(200);
    console.log(
      `top${w}`,
      await page.evaluate(() => {
        const app = document.querySelector("#top-comparison-table")!;
        const ths = Array.from(app.querySelectorAll("thead th")).slice(1);
        const ar = app.getBoundingClientRect();
        return {
          fully: ths.filter((th) => {
            const r = th.getBoundingClientRect();
            return r.left >= ar.left - 1 && r.right <= ar.right + 1;
          }).length,
        };
      }),
    );
  }

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${BASE}/server/compare?slugs=xserver,conoha-wing`, {
    waitUntil: "networkidle",
    timeout: 90000,
  });
  await page.waitForTimeout(800);
  const readCount = () =>
    page.evaluate(() => {
      const m = document.body.innerText.match(/比較対象（(\d+)\s*\/\s*(\d+)）/);
      return {
        count: m ? [m[1], m[2]] : null,
        table: !!document.querySelector("#compare-page-table"),
        cols: document.querySelectorAll("#compare-page-table thead th").length,
      };
    });
  console.log("urlSeed", await readCount());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  console.log("afterReload", await readCount());

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import type { Page } from "playwright";
import { registerExtractHandler } from "@/lib/scraping/engine/registry";
import type { ExtractedMatrix } from "@/lib/scraping/engine/types";

/**
 * お名前.com: 期間が行ラベルの料金表 + 機能ページの2列表をマトリクス化
 */
registerExtractHandler("onamae-price", async ({ page, sourceUrl }) => {
  await page.waitForSelector("table", { state: "attached", timeout: 30_000 });
  const data = await page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll("table"));
    const periodRows: Record<string, string[]> = {};
    const rows: Record<string, string[]> = {};

    for (let ti = 0; ti < tables.length; ti++) {
      const trs = Array.from(tables[ti].querySelectorAll("tr"));
      for (let r = 0; r < trs.length; r++) {
        const cells = Array.from(trs[r].querySelectorAll("th,td")).map((c) =>
          (c.textContent || "").replace(/\s+/g, " ").trim(),
        );
        if (cells.length < 2) continue;
        const label = cells[0];
        const body = cells.slice(1).join(" ");
        if (/\d+\s*ヶ月払い/.test(label) || /\d+\s*ヶ月払いお申込み/.test(label)) {
          const key = label.replace(/\s+/g, "");
          periodRows[key] = [body];
        }
        if (/初期|料金|SSL|バックアップ/.test(label)) {
          rows[label] = [body];
        }
      }
    }

    // キャンペーン初月0円の案内
    const promo = Array.from(document.querySelectorAll("table tr"))
      .map((tr) => (tr.textContent || "").replace(/\s+/g, " ").trim())
      .find((t) => /初回お支払い料金\s*0円|2,398円0円/.test(t));
    if (promo) rows["キャンペーン案内"] = [promo];

    return {
      planNames: ["レンタルサーバー"],
      rows,
      periodRows,
      pageText: document.body.innerText.slice(0, 20000),
    };
  });

  return { ...data, sourceUrl } satisfies ExtractedMatrix;
});

registerExtractHandler("onamae-features", async ({ page, sourceUrl }) => {
  await page.waitForSelector("table", { state: "attached", timeout: 30_000 });
  const data = await page.evaluate(() => {
    const rows: Record<string, string[]> = {};
    const trs = Array.from(document.querySelectorAll("table tr"));
    for (let r = 0; r < trs.length; r++) {
      const cells = Array.from(trs[r].querySelectorAll("th,td")).map((c) =>
        (c.textContent || "").replace(/\s+/g, " ").trim(),
      );
      if (cells.length < 2) continue;
      const label = cells[0];
      if (!label || label.length > 120) continue;
      rows[label] = cells.slice(1);
    }
    return {
      planNames: ["レンタルサーバー"],
      rows,
      periodRows: {},
      pageText: document.body.innerText.slice(0, 20000),
    };
  });
  return { ...data, sourceUrl } satisfies ExtractedMatrix;
});

void (null as unknown as Page);

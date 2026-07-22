import { registerExtractHandler } from "@/lib/scraping/engine/registry";
import type { ExtractedMatrix } from "@/lib/scraping/engine/types";

registerExtractHandler("rakko-cards", async ({ page, sourceUrl }) => {
  await page.waitForSelector(".price_card, .price_card_section", {
    state: "attached",
    timeout: 30_000,
  });

  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".price_tab li, li"));
    for (let i = 0; i < items.length; i++) {
      const t = (items[i].textContent || "").replace(/\s+/g, "");
      if (t === "36ヶ月契約" || t === "36ヶ月") {
        (items[i] as HTMLElement).click();
        return;
      }
    }
  });
  await page.waitForTimeout(800);

  const data = await page.evaluate(() => {
    const cards = Array.from(
      document.querySelectorAll(".section.gray.price_card, .price_card"),
    );
    const parsed = [];
    const seen: Record<string, boolean> = {};
    for (let i = 0; i < cards.length; i++) {
      const text = ((cards[i] as HTMLElement).innerText || "")
        .replace(/\s+/g, " ")
        .trim();
      const nameMatch = text.match(/\b(RK[123])\b/);
      if (!nameMatch) continue;
      const name = nameMatch[1];
      if (seen[name]) continue;
      seen[name] = true;
      const monthlyMatch = text.match(/([\d,]+)\s*円\s*\/\s*月/);
      const storageMatch = text.match(/SSD\s*([\d,]+)\s*(GB|TB)/i);
      parsed.push({
        name,
        bodyText: text.slice(0, 300),
        monthlyRaw: monthlyMatch ? monthlyMatch[0] : null,
        storageRaw: storageMatch
          ? `${storageMatch[1]}${storageMatch[2]}`
          : null,
        initialRaw: "無料",
      });
    }
    return {
      cards: parsed,
      pageText: document.body.innerText.slice(0, 25000),
    };
  });

  return { ...data, sourceUrl };
});

registerExtractHandler("rakko-features", async ({ page, sourceUrl }) => {
  await page.waitForSelector("table", { state: "attached", timeout: 30_000 });
  const data = await page.evaluate(() => {
    const table = document.querySelector("table");
    const trs = Array.from(table?.querySelectorAll("tr") ?? []);
    const headerCells = Array.from(trs[0]?.querySelectorAll("th,td") ?? []);
    const header = [];
    for (let i = 1; i < headerCells.length; i++) {
      const n = (headerCells[i].textContent || "").replace(/\s+/g, " ").trim();
      if (n) header.push(n);
    }
    const rows: Record<string, string[]> = {};
    for (let r = 1; r < trs.length; r++) {
      const cells = Array.from(trs[r].querySelectorAll("th,td"));
      if (cells.length < 2) continue;
      const label = (cells[0].textContent || "").replace(/\s+/g, " ").trim();
      if (!label) continue;
      const values = [];
      for (let i = 1; i < cells.length; i++) {
        let text = (cells[i].textContent || "").replace(/\s+/g, " ").trim();
        // 空でもアイコンがあれば ○
        if (!text) {
          const html = cells[i].innerHTML;
          if (/ok|check|circle|○|〇/i.test(html)) text = "○";
        }
        values.push(text);
      }
      rows[label] = values;
    }
    return {
      planNames: header,
      rows,
      periodRows: {},
      pageText: document.body.innerText.slice(0, 20000),
    };
  });
  return { ...data, sourceUrl } satisfies ExtractedMatrix;
});

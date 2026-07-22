import type { Page } from "playwright";
import type {
  ExtractedMatrix,
  InteractiveStep,
  TableExtractConfig,
} from "@/lib/scraping/engine/types";

export async function runInteractiveSteps(
  page: Page,
  steps: InteractiveStep[] | undefined,
): Promise<void> {
  if (!steps?.length) return;
  for (const step of steps) {
    if (step.type === "wait-ms") {
      await page.waitForTimeout(step.ms);
      continue;
    }
    if (step.type === "click-text") {
      const clicked = await page.evaluate(
        ({ textIncludes, within }) => {
          const root = within
            ? document.querySelector(within) || document.body
            : document.body;
          const candidates = Array.from(
            root.querySelectorAll("button, a, label, li, span, div, input"),
          );
          const needle = textIncludes.replace(/\s+/g, "");
          let target: Element | null = null;
          for (let i = 0; i < candidates.length; i++) {
            const t = (candidates[i].textContent || "").replace(/\s+/g, "");
            if (t === needle || t.includes(needle)) {
              // 短い要素を優先（親DIVの巨大テキストを避ける）
              if (
                !target ||
                t.length < (target.textContent || "").replace(/\s+/g, "").length
              ) {
                target = candidates[i];
              }
            }
          }
          if (!target) return false;
          (target as HTMLElement).click();
          return true;
        },
        { textIncludes: step.textIncludes, within: step.within ?? null },
      );
      if (!clicked) {
        throw new Error(
          `操作「${step.textIncludes}」のクリックに失敗しました。`,
        );
      }
      await page.waitForTimeout(600);
    }
  }
}

/**
 * ページ内テーブルをマトリクスへ抽出。
 * ※ page.evaluate 内にネスト関数を置かない（tsx/esbuild の __name 注入対策）
 */
export async function extractTables(
  page: Page,
  sourceUrl: string,
  config: TableExtractConfig,
): Promise<ExtractedMatrix> {
  await page.waitForSelector("table", {
    state: "attached",
    timeout: 30_000,
  });

  const payload = await page.evaluate(
    ({
      tableIndexes,
      headerRow,
      headerHasNoLabelColumn,
      headerFilterSource,
      periodInFirstColumn,
      booleanMode,
      columnsAsPeriods,
      singlePlanName,
      rowsAsPlans,
    }) => {
      const tables = Array.from(document.querySelectorAll("table"));
      const indexes =
        tableIndexes && tableIndexes.length > 0
          ? tableIndexes
          : tables.map((_, i) => i);

      const headerFilter = headerFilterSource
        ? new RegExp(headerFilterSource)
        : null;

      let planNames: string[] = [];
      const rows: Record<string, string[]> = {};
      const periodRows: Record<string, string[]> = {};

      for (let ii = 0; ii < indexes.length; ii++) {
        const table = tables[indexes[ii]];
        if (!table) continue;
        const trs = Array.from(table.querySelectorAll("tr"));
        if (trs.length === 0) continue;

        const hIndex = headerRow ?? 0;
        const headerCells = Array.from(
          trs[hIndex]?.querySelectorAll("th,td") ?? [],
        );

        // 行＝プラン（VPS 従量表など）: ヘッダーを項目名、先頭列をプラン名に転置
        if (rowsAsPlans) {
          const fieldLabels = [];
          for (let hi = 0; hi < headerCells.length; hi++) {
            fieldLabels.push(
              (headerCells[hi].textContent || "")
                .replace(/\s+/g, " ")
                .trim(),
            );
          }
          const localPlanNames = [];
          for (let r = 0; r < trs.length; r++) {
            if (r === hIndex) continue;
            const cells = Array.from(trs[r].querySelectorAll("th,td"));
            if (cells.length < 2) continue;
            const name = (cells[0].textContent || "")
              .replace(/\s+/g, " ")
              .trim();
            if (!name || name.length > 80) continue;
            if (headerFilter && !headerFilter.test(name)) continue;
            localPlanNames.push(name);
            for (let c = 1; c < cells.length && c < fieldLabels.length; c++) {
              const field = fieldLabels[c];
              if (!field) continue;
              const text = (cells[c].textContent || "")
                .replace(/\s+/g, " ")
                .trim();
              if (!rows[field]) rows[field] = [];
              rows[field].push(text);
            }
          }
          if (localPlanNames.length > 0 && planNames.length === 0) {
            planNames = localPlanNames;
          }
          continue;
        }

        const nameStart = headerHasNoLabelColumn ? 0 : 1;
        const names = [];
        const planColIndexes = [];
        for (let hi = nameStart; hi < headerCells.length; hi++) {
          const n = (headerCells[hi].textContent || "")
            .replace(/\s+/g, " ")
            .trim();
          if (!n) continue;
          if (headerFilter && !headerFilter.test(n)) continue;
          names.push(n);
          planColIndexes.push(hi);
        }

        for (let r = 0; r < trs.length; r++) {
          if (r === hIndex && !columnsAsPeriods) continue;
          if (r === hIndex && columnsAsPeriods) continue;
          const cells = Array.from(trs[r].querySelectorAll("th,td"));
          if (cells.length < 2) continue;

          // inline cell read (no nested fn)
          let label = (cells[0].textContent || "").replace(/\s+/g, " ").trim();
          if (booleanMode === "ok-class") {
            const cls = (cells[0] as HTMLElement).className || "";
            const bg = getComputedStyle(cells[0] as HTMLElement).backgroundImage || "";
            if (cls.includes("ok") || /icon_ok/.test(bg)) label = "○";
          }
          if (!label || label.length > 160) continue;

          const colIndexes = [];
          if (planColIndexes.length > 0) {
            for (let pi = 0; pi < planColIndexes.length; pi++) {
              colIndexes.push(planColIndexes[pi]);
            }
          } else {
            for (let c = 1; c < cells.length; c++) {
              colIndexes.push(c);
            }
          }

          const values = [];
          for (let ci = 0; ci < colIndexes.length; ci++) {
            const c = colIndexes[ci];
            const el = cells[c];
            if (!el) {
              values.push("");
              continue;
            }
            let text = (el.textContent || "").replace(/\s+/g, " ").trim();
            if (booleanMode === "icon-or-mark") {
              if (!text || /^[\uE000-\uF8FF]+$/.test(text)) {
                const hasIcon = el.querySelector(
                  "[class*='check'], [class*='done'], svg, i",
                );
                if (
                  hasIcon ||
                  el.querySelector("img[alt*='対応'], img[alt*='あり']")
                ) {
                  text = "○";
                }
              }
            }
            if (booleanMode === "img-alt") {
              const imgs = Array.from(el.querySelectorAll("img"));
              for (let a = 0; a < imgs.length; a++) {
                const alt = (imgs[a].getAttribute("alt") || "").trim();
                if (alt === "あり" || alt === "○" || alt === "対応") {
                  text = text ? `${text} ○` : "○";
                }
                if (alt === "なし" || alt === "×" || alt === "非対応") {
                  text = text ? `${text} ×` : "×";
                }
              }
            }
            if (booleanMode === "ok-class") {
              const htmlEl = el as HTMLElement;
              const cls = htmlEl.className || "";
              const bg = getComputedStyle(htmlEl).backgroundImage || "";
              if (cls.includes("ok") || /icon_ok/.test(bg)) text = "○";
              else if (
                text === "ー" ||
                text === "-" ||
                text === "×" ||
                cls.includes("ng") ||
                /icon_ng/.test(bg)
              ) {
                text = "×";
              }
            }
            values.push(text);
          }

          rows[label] = values;
          if (
            periodInFirstColumn &&
            (/\d+\s*[ヶカ]?月/.test(label) ||
              /\d+\s*年/.test(label) ||
              /払い/.test(label))
          ) {
            periodRows[label.replace(/\s+/g, "")] = values;
          }
        }

        if (!columnsAsPeriods && names.length > 0 && planNames.length === 0) {
          planNames = names;
        }
      }

      if (columnsAsPeriods) {
        const firstTable = tables[indexes[0]];
        const trs = Array.from(firstTable?.querySelectorAll("tr") ?? []);
        const headerCells = Array.from(
          trs[headerRow ?? 0]?.querySelectorAll("th,td") ?? [],
        );
        const periods = [];
        for (let i = 1; i < headerCells.length; i++) {
          const p = (headerCells[i].textContent || "")
            .replace(/\s+/g, " ")
            .trim();
          if (p) periods.push(p);
        }
        planNames = [singlePlanName || "標準プラン"];
        let priceRow: string[] | null = null;
        const labels = Object.keys(rows);
        for (let i = 0; i < labels.length; i++) {
          const label = labels[i];
          if (/月額|ご利用料金|料金/.test(label) && !/総額|支払/.test(label)) {
            priceRow = rows[label];
            break;
          }
        }
        if (!priceRow) {
          for (let i = 0; i < labels.length; i++) {
            const values = rows[labels[i]];
            let hasYen = false;
            for (let v = 0; v < values.length; v++) {
              if (/\d+\s*円/.test(values[v])) {
                hasYen = true;
                break;
              }
            }
            if (hasYen) {
              priceRow = values;
              break;
            }
          }
        }
        for (let i = 0; i < periods.length; i++) {
          periodRows[periods[i].replace(/\s+/g, "")] = [priceRow?.[i] ?? ""];
        }
      }

      return {
        planNames,
        rows,
        periodRows,
        pageText: document.body.innerText.slice(0, 25000),
      };
    },
    {
      tableIndexes: config.tableIndexes ?? null,
      headerRow: config.headerRow ?? 0,
      headerHasNoLabelColumn: Boolean(config.headerHasNoLabelColumn),
      headerFilterSource: config.headerFilter
        ? config.headerFilter.source
        : null,
      periodInFirstColumn: Boolean(config.periodInFirstColumn),
      booleanMode: config.booleanMode ?? "mark-text",
      columnsAsPeriods: Boolean(config.columnsAsPeriods),
      singlePlanName: config.singlePlanName ?? "標準プラン",
      rowsAsPlans: Boolean(config.rowsAsPlans),
    },
  );

  return { ...payload, sourceUrl };
}

export async function extractCards(
  page: Page,
  sourceUrl: string,
  config: {
    unitSelector: string;
    nameSelector?: string;
    nameWhitelist?: string[];
    nameRegex?: string;
  },
): Promise<{
  cards: {
    name: string;
    bodyText: string;
    monthlyRaw: string | null;
    storageRaw: string | null;
    initialRaw: string | null;
  }[];
  pageText: string;
  sourceUrl: string;
}> {
  await page.waitForSelector(config.unitSelector, {
    state: "attached",
    timeout: 30_000,
  });

  const result = await page.evaluate(
    ({ unitSelector, nameSelector, nameWhitelist, nameRegex }) => {
      const units = Array.from(document.querySelectorAll(unitSelector)).filter(
        (el) => el.getClientRects().length > 0,
      );
      const whitelist = nameWhitelist ?? null;
      const re = nameRegex ? new RegExp(nameRegex) : null;
      const cards = [];
      for (let i = 0; i < units.length; i++) {
        const unit = units[i];
        let name = "";
        if (nameSelector) {
          name = (
            unit.querySelector(nameSelector)?.textContent || ""
          )
            .replace(/\s+/g, " ")
            .trim();
        }
        const bodyText = ((unit as HTMLElement).innerText || "")
          .replace(/\s+/g, " ")
          .trim();
        if (!name) {
          const m = bodyText.match(
            /^(BOX\s*\d+|RK\d+|[ァ-ヶー一-龥A-Za-z0-9]+)/,
          );
          name = m ? m[1].replace(/\s+/g, "") : "";
        }
        if (whitelist) {
          let ok = false;
          for (let w = 0; w < whitelist.length; w++) {
            if (name === whitelist[w] || bodyText.includes(whitelist[w])) {
              ok = true;
              if (bodyText.includes(whitelist[w]) && name !== whitelist[w]) {
                name = whitelist[w];
              }
              break;
            }
          }
          if (!ok) continue;
        }
        if (re && !re.test(name) && !re.test(bodyText)) continue;
        if (!name) continue;

        const monthlyMatch =
          bodyText.match(/月額換算\s*([\d,]+)\s*円/) ||
          bodyText.match(/([\d,]+)\s*円\s*\/\s*月/) ||
          bodyText.match(/([\d,]+)\s*円\/月/);
        const storageMatch = bodyText.match(
          /(?:SSD|容量)[^\d]*([\d,]+)\s*(GB|TB)/i,
        );
        const initialRaw = /初期費用\s*無料|初期費用無料|全プラン初期費用無料/.test(
          bodyText,
        )
          ? "無料"
          : null;

        cards.push({
          name,
          bodyText: bodyText.slice(0, 400),
          monthlyRaw: monthlyMatch ? monthlyMatch[0] : null,
          storageRaw: storageMatch
            ? `${storageMatch[1]}${storageMatch[2]}`
            : null,
          initialRaw,
        });
      }
      return {
        cards,
        pageText: document.body.innerText.slice(0, 25000),
      };
    },
    {
      unitSelector: config.unitSelector,
      nameSelector: config.nameSelector ?? null,
      nameWhitelist: config.nameWhitelist ?? null,
      nameRegex: config.nameRegex ?? null,
    },
  );

  return { ...result, sourceUrl };
}

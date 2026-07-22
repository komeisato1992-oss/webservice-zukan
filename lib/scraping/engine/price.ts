import { normalize } from "@/lib/scraping/normalize";
import type { PriceRuleId } from "@/lib/scraping/engine/types";

export type ParsedPrice = {
  regular: number | null;
  campaign: number | null;
  effective: number | null;
  raw: string;
  warning?: string | null;
  inferred?: boolean;
  annualOrPeriodTotal?: number | null;
};

export function parsePriceCell(
  raw: string,
  rule: PriceRuleId,
  periodMonths?: number | null,
): ParsedPrice {
  const text = raw ?? "";

  if (rule === "dual-struck-campaign") {
    // "1,078円862円" or with HTML already flattened
    const amounts = [...text.matchAll(/([\d,]+)\s*円/g)].map((m) =>
      Number(m[1].replace(/,/g, "")),
    );
    if (amounts.length >= 2) {
      return {
        regular: amounts[0],
        campaign: amounts[1],
        effective: amounts[1],
        raw: text,
      };
    }
    return {
      regular: amounts[0] ?? normalize.yen(text),
      campaign: null,
      effective: null,
      raw: text,
    };
  }

  if (rule === "dual-campaign-renewal") {
    const amounts = [...text.matchAll(/([\d,]+)\s*円/g)].map((m) =>
      Number(m[1].replace(/,/g, "")),
    );
    if (amounts.length >= 2) {
      return {
        regular: amounts[1],
        campaign: amounts[0],
        effective: amounts[0],
        raw: text,
        warning: "更新後月額を通常月額、初回をキャンペーン候補として取得。",
      };
    }
    return {
      regular: amounts[0] ?? null,
      campaign: amounts[0] ?? null,
      effective: amounts[0] ?? null,
      raw: text,
    };
  }

  if (rule === "tax-incl-campaign-renewal") {
    const taxIncl = [...text.matchAll(/税込\s*[¥￥]\s*([\d,]+)/g)].map((m) =>
      Number(m[1].replace(/,/g, "")),
    );
    return {
      regular: taxIncl[1] ?? taxIncl[0] ?? null,
      campaign: taxIncl[0] ?? null,
      effective: taxIncl[0] ?? null,
      raw: text,
      warning: "税込の初回／更新月額を取得しています。",
    };
  }

  if (rule === "paren-monthly-equivalent") {
    // "17,820円( 1,485円 )" or "月額換算 500円"
    const monthlyEq = text.match(/月額換算\s*([\d,]+)\s*円/);
    const paren = text.match(/\(\s*([\d,]+)\s*円\s*\)/);
    const total = text.match(/([\d,]+)\s*円/);
    const monthly = monthlyEq
      ? Number(monthlyEq[1].replace(/,/g, ""))
      : paren
        ? Number(paren[1].replace(/,/g, ""))
        : null;
    return {
      regular: monthly,
      campaign: null,
      effective: monthly,
      raw: text,
      annualOrPeriodTotal: total
        ? Number(total[1].replace(/,/g, ""))
        : null,
      warning: monthly
        ? "月額換算（括弧内または月額換算表記）を採用しています。"
        : null,
    };
  }

  if (rule === "period-total-to-monthly") {
    const amounts = [...text.matchAll(/([\d,]+)\s*円/g)].map((m) =>
      Number(m[1].replace(/,/g, "")),
    );
    // "ご利用料金 891円×36ヶ月" → prefer per-month if present
    const perMonth = text.match(
      /([\d,]+)\s*円\s*[×xX＊*]\s*(\d+)\s*ヶ?月/,
    );
    if (perMonth) {
      return {
        regular: Number(perMonth[1].replace(/,/g, "")),
        campaign: null,
        effective: Number(perMonth[1].replace(/,/g, "")),
        raw: text,
        annualOrPeriodTotal: amounts.length >= 2 ? amounts[amounts.length - 1] : null,
      };
    }
    const total = amounts[0] ?? null;
    const months = periodMonths && periodMonths > 0 ? periodMonths : null;
    if (total != null && months) {
      const monthly = Math.round(total / months);
      return {
        regular: monthly,
        campaign: null,
        effective: monthly,
        raw: text,
        annualOrPeriodTotal: total,
        inferred: true,
        warning: `期間合計 ${total.toLocaleString("ja-JP")}円を${months}で割って月額換算しました。`,
      };
    }
    return {
      regular: total,
      campaign: null,
      effective: total,
      raw: text,
      annualOrPeriodTotal: total,
    };
  }

  // single-yen / default
  if (/^(無料|無し|なし|-\s*|ー\s*|–\s*)$/.test(text.trim()) || /^無料/.test(text.trim())) {
    return {
      regular: 0,
      campaign: null,
      effective: 0,
      raw: text,
    };
  }
  const split = normalize.splitPrice(text);
  return {
    regular: split.regular ?? normalize.yen(text),
    campaign: null,
    effective: split.effective,
    raw: text,
  };
}

export function findPeriodKey(
  periodRows: Record<string, string[]>,
  hints: string[],
  fallbackHints?: string[],
): string | null {
  const keys = Object.keys(periodRows);
  for (const hint of hints) {
    const found = keys.find((k) => k.includes(hint.replace(/\s+/g, "")));
    if (found) return found;
  }
  for (const hint of fallbackHints ?? []) {
    const found = keys.find((k) => k.includes(hint.replace(/\s+/g, "")));
    if (found) return found;
  }
  return keys[0] ?? null;
}

export function periodMonthsFromLabel(label: string | null): number | null {
  if (!label) return null;
  const m = label.match(/(\d+)\s*[ヶカ]?月/);
  if (m) return Number(m[1]);
  const y = label.match(/(\d+)\s*年/);
  if (y) return Number(y[1]) * 12;
  return null;
}

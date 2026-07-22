/** 金額文字列から数値を抽出（円・¥・カンマ対応） */
export function parseYenAmount(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const text = raw.replace(/,/g, "");
  const withYen = text.match(/(?:¥|￥)\s*(\d+(?:\.\d+)?)/);
  if (withYen) {
    const n = Number(withYen[1]);
    return Number.isFinite(n) ? n : null;
  }
  const withEn = text.match(/(\d+(?:\.\d+)?)\s*円/);
  if (withEn) {
    const n = Number(withEn[1]);
    return Number.isFinite(n) ? n : null;
  }
  const cleaned = text.replace(/\s+/g, "");
  const bare = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!bare) return null;
  const n = Number(bare[1]);
  return Number.isFinite(n) ? n : null;
}

/** 税込優先で金額を複数抽出（mixhost 等の「税抜 / 税込」併記向け） */
export function extractYenAmounts(raw: string | null | undefined): number[] {
  if (!raw) return [];
  const text = raw.replace(/,/g, "");
  const amounts: number[] = [];
  const re = /(?:税込\s*)?(?:¥|￥)?\s*(\d+(?:\.\d+)?)\s*円?|(?:¥|￥)\s*(\d+(?:\.\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) != null) {
    const n = Number(m[1] || m[2]);
    if (Number.isFinite(n)) amounts.push(n);
  }
  return amounts;
}

/** 「990円〜」「キャッシュバックで【実質693円〜】」から通常価格と実質価格を分離 */
export function splitRegularAndEffective(raw: string): {
  regular: number | null;
  effective: number | null;
  hasCashback: boolean;
} {
  const hasCashback = /キャッシュバック|実質/.test(raw);
  const yenMatches = [...raw.matchAll(/(\d{1,3}(?:,\d{3})*|\d+)\s*円/g)].map(
    (m) => Number(m[1].replace(/,/g, "")),
  );
  const regular = yenMatches[0] ?? null;
  let effective: number | null = null;
  const effectiveMatch = raw.match(/実質\s*(\d{1,3}(?:,\d{3})*|\d+)\s*円/);
  if (effectiveMatch) {
    effective = Number(effectiveMatch[1].replace(/,/g, ""));
  } else if (hasCashback && yenMatches.length >= 2) {
    effective = yenMatches[1];
  }
  return {
    regular: Number.isFinite(regular as number) ? regular : null,
    effective: Number.isFinite(effective as number) ? effective : null,
    hasCashback,
  };
}

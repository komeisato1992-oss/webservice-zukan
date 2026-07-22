import type { ComparisonField } from "@/lib/types/database";
import {
  isFreeTrialField,
  isStorageTypeField,
} from "@/lib/site/compare-formatters";
import { normalizeValueSource } from "@/lib/site/comparison-display";

/**
 * 比較セルの条件付き強調（青太字 / ⭐）を共通ルールで付与する。
 * 今後の項目追加は THRESHOLD_RULES / matchers に足す。
 */

export type HighlightableCell = {
  text: string;
  raw: number | boolean | string | null;
  isBest: boolean;
  bestLabel: string | null;
  /** 青文字＋太字（⭐なしでも可） */
  emphasize?: boolean;
  plainBold?: boolean;
  priceDisplay?: {
    regularText: string;
    campaignText: string;
  } | null;
  isBooleanTrue?: boolean;
};

export type HighlightRuleId =
  | "initial_fee_zero"
  | "monthly_lte_1000"
  | "monthly_cheapest"
  | "trial_gte_30"
  | "storage_gte_600gb"
  | "storage_max"
  | "storage_type_nvme";

type FieldMatcher = (field: Pick<ComparisonField, "slug" | "name" | "value_source">) => boolean;

export type CompareHighlightRule = {
  id: HighlightRuleId;
  match: FieldMatcher;
  /**
   * cells を受け取り emphasize / isBest を付与した配列を返す。
   * 既存の isBest は維持しつつ、追加ルールを重ねる。
   */
  apply: (cells: HighlightableCell[]) => HighlightableCell[];
};

function isInitialFeeField(
  field: Pick<ComparisonField, "slug" | "name" | "value_source">,
): boolean {
  return (
    normalizeValueSource(field.value_source) === "plan_initial_fee" ||
    field.slug === "initial-fee" ||
    /初期費用/.test(field.name)
  );
}

function isMonthlyPriceField(
  field: Pick<ComparisonField, "slug" | "name" | "value_source">,
): boolean {
  return (
    normalizeValueSource(field.value_source) === "plan_monthly_price" ||
    field.slug === "monthly-price" ||
    /月額/.test(field.name)
  );
}

function isStorageCapacityField(
  field: Pick<ComparisonField, "slug" | "name" | "value_source">,
): boolean {
  return (
    normalizeValueSource(field.value_source) === "plan_storage" ||
    field.slug === "storage" ||
    (/容量/.test(field.name) && !/種類|タイプ|type/i.test(field.name))
  );
}

/** ストレージ値を GB 換算（raw が既に GB 想定でも unit 付きテキストから補正可） */
export function storageToGb(
  value: number | null | undefined,
  unit?: string | null,
): number | null {
  if (value == null || Number.isNaN(Number(value))) return null;
  const n = Number(value);
  const u = (unit ?? "GB").toUpperCase();
  if (u.includes("TB")) return n * 1024;
  if (u.includes("MB")) return n / 1024;
  return n;
}

function parseGbFromText(text: string): number | null {
  const m = text.match(/([\d,.]+)\s*(TB|GB|MB)?/i);
  if (!m) return null;
  const n = Number(String(m[1]).replace(/,/g, ""));
  if (Number.isNaN(n)) return null;
  return storageToGb(n, m[2] ?? "GB");
}

function cellGb(cell: HighlightableCell): number | null {
  if (typeof cell.raw === "number") return cell.raw;
  return parseGbFromText(cell.text);
}

const RULE_INITIAL_FEE_ZERO: CompareHighlightRule = {
  id: "initial_fee_zero",
  match: isInitialFeeField,
  apply: (cells) =>
    cells.map((c) => {
      const zero = typeof c.raw === "number" && c.raw === 0;
      return {
        ...c,
        emphasize: Boolean(c.emphasize) || zero,
        // ¥0 は青太字のみ（⭐なし）
        plainBold: false,
        isBest: false,
        bestLabel: null,
      };
    }),
};

const RULE_MONTHLY: CompareHighlightRule = {
  id: "monthly_lte_1000",
  match: isMonthlyPriceField,
  apply: (cells) =>
    cells.map((c) => {
      const raw = typeof c.raw === "number" ? c.raw : null;
      const lte = raw != null && raw <= 1000;
      return {
        ...c,
        // ¥1,000以下 or 最安(⭐) → 青太字
        emphasize: Boolean(c.emphasize) || lte || c.isBest,
      };
    }),
};

const RULE_TRIAL: CompareHighlightRule = {
  id: "trial_gte_30",
  match: (f) => isFreeTrialField(f),
  apply: (cells) =>
    cells.map((c) => {
      const days = typeof c.raw === "number" ? c.raw : null;
      const ok = days != null && days >= 30;
      return {
        ...c,
        emphasize: Boolean(c.emphasize) || ok,
        // お試しは⭐なし
        isBest: false,
        bestLabel: null,
      };
    }),
};

const RULE_STORAGE: CompareHighlightRule = {
  id: "storage_gte_600gb",
  match: isStorageCapacityField,
  apply: (cells) =>
    cells.map((c) => {
      const gb = cellGb(c);
      const gte = gb != null && gb >= 600;
      return {
        ...c,
        // 600GB以上 or 最大(⭐) → 青太字
        emphasize: Boolean(c.emphasize) || gte || c.isBest,
      };
    }),
};

const RULE_NVME: CompareHighlightRule = {
  id: "storage_type_nvme",
  match: (f) => isStorageTypeField(f),
  apply: (cells) =>
    cells.map((c) => {
      const text = String(c.raw ?? c.text ?? "");
      const nvme = /nvme/i.test(text);
      return {
        ...c,
        emphasize: Boolean(c.emphasize) || nvme,
        // NVMe は青太字のみ（⭐なし）
        isBest: false,
        bestLabel: null,
      };
    }),
};

/** 登録済みルール（順序: フィールド固有 → 汎用） */
export const COMPARE_HIGHLIGHT_RULES: CompareHighlightRule[] = [
  RULE_INITIAL_FEE_ZERO,
  RULE_MONTHLY,
  RULE_TRIAL,
  RULE_STORAGE,
  RULE_NVME,
];

/**
 * フィールドにマッチするルールを適用してセル強調を付与。
 */
export function applyCompareValueHighlights<T extends HighlightableCell>(
  field: Pick<ComparisonField, "slug" | "name" | "value_source">,
  cells: T[],
): T[] {
  let next: HighlightableCell[] = cells;
  for (const rule of COMPARE_HIGHLIGHT_RULES) {
    if (!rule.match(field)) continue;
    next = rule.apply(next);
  }
  return next as T[];
}

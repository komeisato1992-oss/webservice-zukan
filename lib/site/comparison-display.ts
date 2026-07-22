import type {
  CompareRule,
  ComparisonField,
  ComparisonValueSource,
} from "@/lib/types/database";
import type { CompareBestKind } from "@/lib/site/compare-rows";

export type ComparisonDisplaySlot =
  | "top_featured"
  | "top_table"
  | "compare_page";

export const TOP_FEATURED_FIELD_COUNT = 5;
export const TOP_TABLE_FIELD_MAX = 10;

export function normalizeValueSource(
  source: ComparisonValueSource | string | null | undefined,
): ComparisonValueSource {
  if (
    source === "plan_monthly_price" ||
    source === "plan_initial_fee" ||
    source === "plan_storage"
  ) {
    return source;
  }
  return "comparison_value";
}

export function resolveCompareRule(
  field: ComparisonField,
): CompareBestKind | "text" {
  if (field.compare_rule) return field.compare_rule;
  if (field.field_type === "boolean") return "true";
  if (field.field_type === "rating") return "score";
  if (field.field_type === "number") {
    if (/price|料金|費用|fee|コスト/.test(field.slug + field.name)) {
      return "min";
    }
    return "max";
  }
  return "text";
}

export function fieldsForSlot(
  fields: ComparisonField[],
  slot: ComparisonDisplaySlot,
): ComparisonField[] {
  const filtered = fields.filter((f) => {
    if (!f.is_published) return false;
    if (slot === "top_featured") return Boolean(f.show_in_top_featured);
    if (slot === "top_table") return Boolean(f.show_in_top_table);
    // 比較ページ: 管理画面で明示的にオンの項目のみ
    return Boolean(f.show_in_compare_page);
  });

  const orderKey =
    slot === "top_featured"
      ? "top_featured_display_order"
      : slot === "top_table"
        ? "top_table_display_order"
        : "compare_page_display_order";

  return [...filtered].sort((a, b) => {
    const ao = a[orderKey] ?? a.display_order ?? 0;
    const bo = b[orderKey] ?? b.display_order ?? 0;
    if (ao !== bo) return ao - bo;
    return a.display_order - b.display_order || a.name.localeCompare(b.name, "ja");
  });
}

/** 未設定時の人気3社デフォルト5項目（slug） */
export const DEFAULT_TOP_FEATURED_SLUGS = [
  "initial-fee",
  "monthly-price",
  "free-trial-days",
  "storage",
  "support",
] as const;

export function resolveTopFeaturedFields(
  fields: ComparisonField[],
): ComparisonField[] {
  const configured = fieldsForSlot(fields, "top_featured");
  if (configured.length === TOP_FEATURED_FIELD_COUNT) return configured;

  // マイグレーション未適用 / 未設定時のフォールバック
  const bySlug = new Map(fields.map((f) => [f.slug, f]));
  const fallback: ComparisonField[] = [];
  for (const slug of DEFAULT_TOP_FEATURED_SLUGS) {
    const found =
      bySlug.get(slug) ??
      fields.find((f) => {
        if (slug === "free-trial-days") {
          return /trial|お試し|無料期間/.test(f.slug + f.name);
        }
        if (slug === "support") {
          return /^support$/i.test(f.slug) || f.name === "サポート";
        }
        return f.slug === slug;
      });
    if (found) fallback.push(found);
  }
  return fallback.slice(0, TOP_FEATURED_FIELD_COUNT);
}

export function resolveTopTableFields(
  fields: ComparisonField[],
): ComparisonField[] {
  const configured = fieldsForSlot(fields, "top_table");
  if (configured.length > 0) {
    return configured.slice(0, TOP_TABLE_FIELD_MAX);
  }
  // 未設定時: 人気3社5項目をベースに最大10
  const featured = resolveTopFeaturedFields(fields);
  if (featured.length > 0) return featured;
  return fields
    .filter((f) => f.is_published)
    .sort((a, b) => a.display_order - b.display_order)
    .slice(0, TOP_TABLE_FIELD_MAX);
}

export function resolveComparePageFields(
  fields: ComparisonField[],
): ComparisonField[] {
  const configured = fieldsForSlot(fields, "compare_page");
  if (configured.length > 0) return configured;

  const published = fields.filter((f) => f.is_published);
  // 管理画面で比較ページ表示をすべてオフにしている場合は空
  const anyOn = published.some((f) => f.show_in_compare_page === true);
  const anyOff = published.some((f) => f.show_in_compare_page === false);
  if (anyOff && !anyOn) return [];

  // 未設定（マイグレーション直後など）は公開項目を表示順で返す
  return [...published].sort((a, b) => a.display_order - b.display_order);
}

export function emptyDisplayForField(field: ComparisonField): string {
  // 比較表は空値を「-」で統一（情報なし表記は使わない）
  void field;
  return "-";
}

export function validateComparisonDisplayPlacement(input: {
  featuredIds: string[];
  tableIds: string[];
  compareIds: string[];
}): { ok: true } | { ok: false; message: string } {
  if (input.featuredIds.length !== TOP_FEATURED_FIELD_COUNT) {
    return {
      ok: false,
      message: "TOP 人気3社の比較は5項目を選択してください",
    };
  }
  if (input.tableIds.length === 0) {
    return {
      ok: false,
      message: "TOP レンタルサーバーを比較は1項目以上を選択してください",
    };
  }
  if (input.tableIds.length > TOP_TABLE_FIELD_MAX) {
    return {
      ok: false,
      message: `TOP レンタルサーバーを比較は最大${TOP_TABLE_FIELD_MAX}項目までです`,
    };
  }
  return { ok: true };
}

export function compareRuleLabel(rule: CompareRule | null | undefined): string {
  switch (rule) {
    case "min":
      return "安い順 / 小さい順";
    case "max":
      return "大きい順 / 長い順";
    case "true":
      return "対応あり優先";
    case "score":
      return "評価の高い順";
    default:
      return "—";
  }
}

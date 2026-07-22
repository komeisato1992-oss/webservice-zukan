import type {
  ComparisonField,
  ComparisonValue,
  FieldType,
} from "@/lib/types/database";

export type { FieldType, ServicePlan, ComparisonField, ComparisonValue } from "@/lib/types/database";

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  boolean: "真偽値",
  number: "数値",
  text: "テキスト",
  select: "選択",
  rating: "評価",
};

/** 管理画面の表示グループ候補（自由入力も可） */
export const DISPLAY_GROUP_PRESETS = [
  "料金",
  "容量・性能",
  "WordPress",
  "バックアップ",
  "サポート",
  "セキュリティ",
  "その他",
] as const;

export const UNGROUPED_LABEL = "その他";

export function parseSelectOptions(
  options: string[] | string | null | undefined,
): string[] {
  if (!options) return [];
  if (Array.isArray(options)) {
    return options.map((s) => String(s).trim()).filter(Boolean);
  }
  return options
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function selectOptionsToText(
  options: string[] | string | null | undefined,
): string {
  return parseSelectOptions(options).join(", ");
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return `¥${Number(value).toLocaleString("ja-JP")}`;
}

export function formatStorage(
  value: number | null | undefined,
  unit: string | null | undefined,
): string {
  if (value == null) return "-";
  return `${Number(value).toLocaleString("ja-JP")}${unit ? ` ${unit}` : ""}`;
}

/** 値が登録されているか（公開表示の非表示判定用） */
export function hasComparisonValue(
  field: Pick<ComparisonField, "field_type">,
  value: Pick<
    ComparisonValue,
    "boolean_value" | "number_value" | "text_value"
  > | null | undefined,
): boolean {
  if (!value) return false;
  switch (field.field_type) {
    case "boolean":
      return value.boolean_value != null;
    case "number":
    case "rating":
      return value.number_value != null;
    case "text":
    case "select":
      return Boolean(value.text_value?.trim());
    default:
      return false;
  }
}

export function formatComparisonDisplay(
  field: Pick<ComparisonField, "field_type" | "unit">,
  value: Pick<
    ComparisonValue,
    "boolean_value" | "number_value" | "text_value"
  > | null,
): string {
  if (!value) return "—";
  switch (field.field_type) {
    case "boolean":
      if (value.boolean_value == null) return "-";
      return value.boolean_value ? "○" : "—";
    case "number":
      if (value.number_value == null) return "—";
      return `${Number(value.number_value).toLocaleString("ja-JP")}${
        field.unit ? ` ${field.unit}` : ""
      }`;
    case "rating":
      if (value.number_value == null) return "—";
      return `${Number(value.number_value).toLocaleString("ja-JP")}${
        field.unit ? ` ${field.unit}` : ""
      }`;
    case "text":
    case "select":
      return value.text_value?.trim() || "—";
    default:
      return "—";
  }
}

export function formatRatingStars(score: number | null | undefined): string {
  if (score == null || Number.isNaN(Number(score))) return "—";
  const n = Math.max(0, Math.min(5, Math.round(Number(score))));
  return `${"★".repeat(n)}${"☆".repeat(5 - n)} (${Number(score)})`;
}

export function groupFieldsByDisplayGroup<T extends Pick<ComparisonField, "display_group" | "display_order" | "name">>(
  fields: T[],
): { group: string; fields: T[] }[] {
  const order: string[] = [];
  const map = new Map<string, T[]>();

  for (const field of fields) {
    const group = field.display_group?.trim() || UNGROUPED_LABEL;
    if (!map.has(group)) {
      map.set(group, []);
      order.push(group);
    }
    map.get(group)!.push(field);
  }

  // プリセット順を優先し、未知グループは出現順
  const presetIndex = new Map<string, number>(
    DISPLAY_GROUP_PRESETS.map((g, i) => [g, i]),
  );
  order.sort((a, b) => {
    const ai = presetIndex.has(a) ? presetIndex.get(a)! : 1000;
    const bi = presetIndex.has(b) ? presetIndex.get(b)! : 1000;
    if (ai !== bi) return ai - bi;
    return a.localeCompare(b, "ja");
  });

  return order.map((group) => ({
    group,
    fields: map.get(group) ?? [],
  }));
}

export function comparisonValueKey(
  fieldId: string,
  planId: string | null | undefined,
): string {
  return `${fieldId}::${planId ?? "service"}`;
}

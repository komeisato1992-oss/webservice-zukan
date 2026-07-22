/**
 * Multi-sheet field catalog — maps sheet columns to existing DB schema only.
 * Unknown/extra sheet columns are ignored on import (warnings only).
 */

import { SUPPORT_SHEET_FIELDS } from "@/lib/site/support";

export const CLEAR_SENTINEL = "__CLEAR__";
export const SCHEMA_VERSION = "6";

export const SHEET_NAMES = {
  services: "services",
  plans: "plans",
  campaigns: "campaigns",
  comparisonFields: "comparison_fields",
  /** @deprecated alias — export/import also accepts comparison_items */
  comparisonItems: "comparison_fields",
  comparisonLayout: "comparison_layout",
  scrapingCandidates: "scraping_candidates",
  rankings: "rankings",
  syncInfo: "sync_info",
} as const;

export type SheetName =
  (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES];

export type CellKind =
  | "string"
  | "number"
  | "boolean"
  | "url"
  | "readonly"
  | "identity";

export type FieldTarget =
  | { table: "services"; column: string }
  | { table: "service_plans"; column: string }
  | { table: "comparison_fields"; column: string }
  | {
      table: "comparison_values";
      fieldSlug: string;
      valueKind: "boolean" | "text";
    }
  | { table: "meta"; column: string };

export type SheetFieldDef = {
  /** Exact header in Google Sheet */
  key: string;
  kind: CellKind;
  /** Required for row identity */
  required?: boolean;
  /** Never written from import */
  readonly?: boolean;
  /** Identity — cannot __CLEAR__ */
  identity?: boolean;
  target: FieldTarget;
};

/** services sheet — existing DB columns only */
export const SERVICE_FIELDS: SheetFieldDef[] = [
  {
    key: "service_id",
    kind: "identity",
    required: true,
    identity: true,
    readonly: true,
    target: { table: "meta", column: "service_id" },
  },
  {
    key: "slug",
    kind: "identity",
    required: true,
    identity: true,
    readonly: true,
    target: { table: "services", column: "slug" },
  },
  {
    key: "サービス名",
    kind: "string",
    target: { table: "services", column: "name" },
  },
  {
    key: "短い説明",
    kind: "string",
    target: { table: "services", column: "catchphrase" },
  },
  {
    key: "運営会社",
    kind: "string",
    target: { table: "services", column: "company_name" },
  },
  {
    key: "サービス開始年",
    kind: "number",
    target: { table: "services", column: "service_start_year" },
  },
  {
    key: "データセンター所在地",
    kind: "string",
    target: { table: "services", column: "datacenter_location" },
  },
  {
    key: "編集者コメント",
    kind: "string",
    target: { table: "services", column: "editor_comment" },
  },
  {
    key: "公式URL",
    kind: "url",
    target: { table: "services", column: "official_url" },
  },
  {
    key: "アフィリエイトURL",
    kind: "url",
    target: { table: "services", column: "affiliate_url" },
  },
  {
    key: "ASP",
    kind: "string",
    target: { table: "services", column: "affiliate_network" },
  },
  {
    key: "提携状況",
    kind: "string",
    target: { table: "services", column: "affiliate_status" },
  },
  {
    key: "ロゴURL",
    kind: "url",
    target: { table: "services", column: "logo_url" },
  },
  {
    key: "公開状態",
    kind: "boolean",
    target: { table: "services", column: "is_published" },
  },
  {
    key: "is_site_visible",
    kind: "boolean",
    target: { table: "services", column: "is_site_visible" },
  },
  {
    key: "本サイト表示",
    kind: "boolean",
    target: { table: "services", column: "is_site_visible" },
  },
  {
    key: "おすすめ状態",
    kind: "boolean",
    target: { table: "services", column: "is_featured" },
  },
  {
    key: "TOP人気3社表示",
    kind: "boolean",
    target: { table: "services", column: "show_in_top_featured_comparison" },
  },
  {
    key: "TOP比較表示",
    kind: "boolean",
    target: { table: "services", column: "show_in_top_comparison" },
  },
  {
    key: "表示順",
    kind: "number",
    target: { table: "services", column: "display_order" },
  },
  // Support comparison_values (service-level) — TRUE/FALSE/空欄=未確認
  ...SUPPORT_SHEET_FIELDS.map(
    (f): SheetFieldDef => ({
      key: f.key,
      kind: f.kind === "boolean" ? "boolean" : f.kind === "url" ? "url" : "string",
      target: {
        table: "comparison_values",
        fieldSlug: f.slug,
        valueKind: f.kind === "boolean" ? "boolean" : "text",
      },
    }),
  ),
  {
    key: "更新日時",
    kind: "readonly",
    readonly: true,
    identity: true,
    target: { table: "meta", column: "updated_at" },
  },
];

/** plans sheet — service_plans columns only */
export const PLAN_FIELDS: SheetFieldDef[] = [
  {
    key: "plan_id",
    kind: "identity",
    required: true,
    identity: true,
    readonly: true,
    target: { table: "meta", column: "plan_id" },
  },
  {
    key: "service_id",
    kind: "identity",
    required: true,
    identity: true,
    readonly: true,
    target: { table: "meta", column: "service_id" },
  },
  {
    key: "service_slug",
    kind: "readonly",
    readonly: true,
    identity: true,
    target: { table: "meta", column: "service_slug" },
  },
  {
    key: "サービス名",
    kind: "readonly",
    readonly: true,
    target: { table: "meta", column: "service_name" },
  },
  {
    key: "プラン名",
    kind: "string",
    target: { table: "service_plans", column: "name" },
  },
  {
    key: "表示名",
    kind: "string",
    target: { table: "service_plans", column: "display_name" },
  },
  {
    key: "月額料金",
    kind: "number",
    target: { table: "service_plans", column: "effective_monthly_price" },
  },
  {
    key: "初期費用",
    kind: "number",
    target: { table: "service_plans", column: "initial_fee" },
  },
  {
    key: "通常価格",
    kind: "number",
    target: { table: "service_plans", column: "regular_monthly_price" },
  },
  {
    key: "キャンペーン価格",
    kind: "number",
    target: { table: "service_plans", column: "campaign_monthly_price" },
  },
  {
    key: "容量",
    kind: "number",
    target: { table: "service_plans", column: "storage_value" },
  },
  {
    key: "容量単位",
    kind: "string",
    target: { table: "service_plans", column: "storage_unit" },
  },
  {
    key: "ストレージ種類",
    kind: "string",
    target: { table: "service_plans", column: "storage_type" },
  },
  {
    key: "契約期間",
    kind: "string",
    target: { table: "service_plans", column: "billing_period" },
  },
  {
    key: "CPU",
    kind: "string",
    target: { table: "service_plans", column: "cpu" },
  },
  {
    key: "メモリ",
    kind: "string",
    target: { table: "service_plans", column: "memory" },
  },
  {
    key: "転送量",
    kind: "string",
    target: { table: "service_plans", column: "transfer_amount" },
  },
  {
    key: "無料お試し期間",
    kind: "number",
    target: { table: "service_plans", column: "free_trial_days" },
  },
  {
    key: "無料ドメイン数",
    kind: "string",
    target: { table: "service_plans", column: "free_domain_count" },
  },
  {
    key: "マルチドメイン数",
    kind: "string",
    target: { table: "service_plans", column: "multi_domain_count" },
  },
  {
    key: "データベース数",
    kind: "string",
    target: { table: "service_plans", column: "database_count" },
  },
  {
    key: "支払い方法",
    kind: "string",
    target: { table: "service_plans", column: "payment_methods" },
  },
  {
    key: "最低契約期間",
    kind: "string",
    target: { table: "service_plans", column: "min_contract_period" },
  },
  {
    key: "公式URL",
    kind: "string",
    target: { table: "service_plans", column: "official_url" },
  },
  {
    key: "代表プラン",
    kind: "boolean",
    target: { table: "service_plans", column: "is_default_comparison_plan" },
  },
  {
    key: "公開状態",
    kind: "boolean",
    target: { table: "service_plans", column: "is_published" },
  },
  {
    key: "表示順",
    kind: "number",
    target: { table: "service_plans", column: "display_order" },
  },
  {
    key: "更新日時",
    kind: "readonly",
    readonly: true,
    identity: true,
    target: { table: "meta", column: "updated_at" },
  },
];

/** comparison_fields sheet (was comparison_items) */
export const COMPARISON_ITEM_FIELDS: SheetFieldDef[] = [
  {
    key: "comparison_item_id",
    kind: "identity",
    required: true,
    identity: true,
    readonly: true,
    target: { table: "meta", column: "comparison_item_id" },
  },
  {
    key: "項目キー",
    kind: "identity",
    required: true,
    identity: true,
    readonly: true,
    target: { table: "comparison_fields", column: "slug" },
  },
  {
    key: "表示名",
    kind: "string",
    target: { table: "comparison_fields", column: "name" },
  },
  {
    key: "カテゴリ",
    kind: "string",
    target: { table: "comparison_fields", column: "display_group" },
  },
  {
    key: "単位",
    kind: "string",
    target: { table: "comparison_fields", column: "unit" },
  },
  {
    key: "表示形式",
    kind: "string",
    target: { table: "comparison_fields", column: "field_type" },
  },
  {
    key: "表示順",
    kind: "number",
    target: { table: "comparison_fields", column: "display_order" },
  },
  {
    key: "公開状態",
    kind: "boolean",
    target: { table: "comparison_fields", column: "is_published" },
  },
];

/** comparison_layout — where each field appears */
export const COMPARISON_LAYOUT_FIELDS: SheetFieldDef[] = [
  {
    key: "comparison_item_id",
    kind: "identity",
    required: true,
    identity: true,
    readonly: true,
    target: { table: "meta", column: "comparison_item_id" },
  },
  {
    key: "項目キー",
    kind: "identity",
    required: true,
    identity: true,
    readonly: true,
    target: { table: "comparison_fields", column: "slug" },
  },
  {
    key: "表示名",
    kind: "readonly",
    readonly: true,
    target: { table: "comparison_fields", column: "name" },
  },
  {
    key: "TOP人気3社",
    kind: "boolean",
    target: { table: "comparison_fields", column: "show_in_top_featured" },
  },
  {
    key: "TOP比較",
    kind: "boolean",
    target: { table: "comparison_fields", column: "show_in_top_table" },
  },
  {
    key: "比較ページ",
    kind: "boolean",
    target: { table: "comparison_fields", column: "show_in_compare_page" },
  },
];

/** campaigns sheet */
export const CAMPAIGN_FIELDS: SheetFieldDef[] = [
  {
    key: "campaign_id",
    kind: "identity",
    required: true,
    identity: true,
    readonly: true,
    target: { table: "meta", column: "campaign_id" },
  },
  {
    key: "service_id",
    kind: "identity",
    required: true,
    identity: true,
    readonly: true,
    target: { table: "meta", column: "service_id" },
  },
  {
    key: "キャンペーン名",
    kind: "string",
    target: { table: "meta", column: "name" },
  },
  {
    key: "概要",
    kind: "string",
    target: { table: "meta", column: "summary" },
  },
  {
    key: "割引率",
    kind: "number",
    target: { table: "meta", column: "discount_rate" },
  },
  {
    key: "割引額",
    kind: "number",
    target: { table: "meta", column: "discount_amount" },
  },
  {
    key: "クーポン",
    kind: "string",
    target: { table: "meta", column: "coupon_code" },
  },
  {
    key: "初月無料",
    kind: "boolean",
    target: { table: "meta", column: "first_month_free" },
  },
  {
    key: "終了日",
    kind: "string",
    target: { table: "meta", column: "ends_on" },
  },
  {
    key: "出典URL",
    kind: "url",
    target: { table: "meta", column: "source_url" },
  },
  {
    key: "公開状態",
    kind: "boolean",
    target: { table: "meta", column: "is_published" },
  },
];

/** scraping_candidates sheet (export/review) */
export const SCRAPING_CANDIDATE_FIELDS: SheetFieldDef[] = [
  {
    key: "candidate_id",
    kind: "identity",
    required: true,
    identity: true,
    readonly: true,
    target: { table: "meta", column: "candidate_id" },
  },
  {
    key: "service_id",
    kind: "readonly",
    readonly: true,
    identity: true,
    target: { table: "meta", column: "service_id" },
  },
  {
    key: "項目キー",
    kind: "readonly",
    readonly: true,
    target: { table: "meta", column: "field_key" },
  },
  {
    key: "現在値",
    kind: "readonly",
    readonly: true,
    target: { table: "meta", column: "current_published_value" },
  },
  {
    key: "候補値",
    kind: "string",
    target: { table: "meta", column: "candidate_value" },
  },
  {
    key: "信頼度",
    kind: "readonly",
    readonly: true,
    target: { table: "meta", column: "confidence" },
  },
  {
    key: "取得元",
    kind: "readonly",
    readonly: true,
    target: { table: "meta", column: "source_url" },
  },
  {
    key: "取得日時",
    kind: "readonly",
    readonly: true,
    target: { table: "meta", column: "fetched_at" },
  },
  {
    key: "公開状態",
    kind: "readonly",
    readonly: true,
    target: { table: "meta", column: "status" },
  },
];

export const SYNC_INFO_HEADERS = [
  "exported_at",
  "exported_by",
  "schema_version",
  "service_count",
  "plan_count",
  "campaign_count",
  "comparison_item_count",
  "comparison_layout_count",
  "scraping_candidate_count",
] as const;

export const SERVICE_HEADERS = SERVICE_FIELDS.map((f) => f.key);
export const PLAN_HEADERS = PLAN_FIELDS.map((f) => f.key);
export const COMPARISON_ITEM_HEADERS = COMPARISON_ITEM_FIELDS.map((f) => f.key);

export const SERVICE_FIELD_MAP = Object.fromEntries(
  SERVICE_FIELDS.map((f) => [f.key, f]),
) as Record<string, SheetFieldDef>;

export const PLAN_FIELD_MAP = Object.fromEntries(
  PLAN_FIELDS.map((f) => [f.key, f]),
) as Record<string, SheetFieldDef>;

export const COMPARISON_ITEM_FIELD_MAP = Object.fromEntries(
  COMPARISON_ITEM_FIELDS.map((f) => [f.key, f]),
) as Record<string, SheetFieldDef>;

/** Writable whitelist for apply */
export function isWritableField(
  sheet: "services" | "plans" | "comparison_items",
  fieldKey: string,
): boolean {
  const map =
    sheet === "services"
      ? SERVICE_FIELD_MAP
      : sheet === "plans"
        ? PLAN_FIELD_MAP
        : COMPARISON_ITEM_FIELD_MAP;
  const def = map[fieldKey];
  return Boolean(def && !def.readonly && !def.identity);
}

// ---------------------------------------------------------------------------
// Legacy flat Master sheet helpers (CSV/XLSX / scrape locks)
// ---------------------------------------------------------------------------
export type SpreadsheetValueKind = CellKind | "score" | "status";
export type SpreadsheetTarget = FieldTarget;
export type SpreadsheetFieldDef = SheetFieldDef & {
  label?: string;
  scoreMin?: number;
  scoreMax?: number;
};

/** @deprecated flat Master — kept for scrape lock key mapping */
export const SPREADSHEET_FIELDS: SpreadsheetFieldDef[] = [
  ...SERVICE_FIELDS.map((f) => ({ ...f, label: f.key })),
  {
    key: "monthly_price",
    kind: "number",
    label: "monthly_price",
    target: { table: "service_plans", column: "regular_monthly_price" },
  },
  {
    key: "campaign_price",
    kind: "number",
    label: "campaign_price",
    target: { table: "service_plans", column: "campaign_monthly_price" },
  },
  {
    key: "effective_monthly_price",
    kind: "number",
    label: "effective_monthly_price",
    target: { table: "service_plans", column: "effective_monthly_price" },
  },
  {
    key: "initial_fee",
    kind: "number",
    label: "initial_fee",
    target: { table: "service_plans", column: "initial_fee" },
  },
  {
    key: "storage_amount",
    kind: "number",
    label: "storage_amount",
    target: { table: "service_plans", column: "storage_value" },
  },
  {
    key: "storage_unit",
    kind: "string",
    label: "storage_unit",
    target: { table: "service_plans", column: "storage_unit" },
  },
  {
    key: "billing_period",
    kind: "string",
    label: "billing_period",
    target: { table: "service_plans", column: "billing_period" },
  },
  {
    key: "representative_plan",
    kind: "string",
    label: "representative_plan",
    target: { table: "service_plans", column: "name" },
  },
];

/** rankings シート（インポート時はドラフトへ） */
export const RANKING_FIELDS: SheetFieldDef[] = [
  {
    key: "category_slug",
    kind: "string",
    required: true,
    target: { table: "meta", column: "purpose_id" },
  },
  {
    key: "category_name",
    kind: "string",
    readonly: true,
    target: { table: "meta", column: "category_name" },
  },
  {
    key: "rank",
    kind: "number",
    required: true,
    target: { table: "meta", column: "rank" },
  },
  {
    key: "service_id",
    kind: "string",
    target: { table: "meta", column: "service_id" },
  },
  {
    key: "service_slug",
    kind: "string",
    target: { table: "meta", column: "service_slug" },
  },
  {
    key: "plan_id",
    kind: "string",
    target: { table: "meta", column: "plan_id" },
  },
  {
    key: "plan_name",
    kind: "string",
    readonly: true,
    target: { table: "meta", column: "plan_name" },
  },
  {
    key: "rating",
    kind: "number",
    target: { table: "meta", column: "rating" },
  },
  {
    key: "card_comment",
    kind: "string",
    target: { table: "meta", column: "card_comment" },
  },
  {
    key: "sub_comment",
    kind: "string",
    target: { table: "meta", column: "sub_comment" },
  },
  {
    key: "is_visible",
    kind: "boolean",
    target: { table: "meta", column: "is_visible" },
  },
  {
    key: "status",
    kind: "string",
    readonly: true,
    target: { table: "meta", column: "status" },
  },
  {
    key: "display_order",
    kind: "number",
    target: { table: "meta", column: "display_order" },
  },
];

export const SPREADSHEET_FIELD_MAP = Object.fromEntries(
  SPREADSHEET_FIELDS.map((f) => [f.key, f]),
) as Record<string, SpreadsheetFieldDef>;

export const MASTER_HEADERS = SPREADSHEET_FIELDS.map((f) => f.key);
export const TEMPLATE_HEADERS = MASTER_HEADERS;

export function comparisonColumnKey(fieldSlug: string) {
  return `cmp_${fieldSlug}`;
}

export function isComparisonColumn(key: string) {
  return key.startsWith("cmp_");
}

export function comparisonSlugFromKey(key: string) {
  return key.slice(4);
}

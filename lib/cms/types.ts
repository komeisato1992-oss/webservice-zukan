import type { Json } from "@/lib/types/database";

export type CmsPublishStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "unpublished"
  | "expired";

export type CmsChangeSource =
  | "scraping"
  | "google_sheets"
  | "admin"
  | "manual";

export type CmsEntityType =
  | "service"
  | "plan"
  | "campaign"
  | "comparison_field"
  | "comparison_value"
  | "comparison_layout"
  | "seo";

export type CmsChangeItemStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "discarded";

export type ScrapingCandidateStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "edited_accepted";

export type TriBool = true | false | null;

export type ServiceDraftPayload = {
  service: Record<string, unknown>;
  plans: Record<string, unknown>[];
  comparison_values: Record<string, unknown>[];
  campaigns: Record<string, unknown>[];
  seo?: Record<string, unknown>;
};

export type CmsServiceDraft = {
  service_id: string;
  payload: ServiceDraftPayload;
  published_snapshot: ServiceDraftPayload | null;
  status: CmsPublishStatus;
  change_count: number;
  last_change_source: CmsChangeSource | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CmsChangeItem = {
  id: string;
  entity_type: CmsEntityType;
  entity_id: string | null;
  parent_service_id: string | null;
  parent_plan_id: string | null;
  field_key: string;
  field_label: string | null;
  old_value: Json | null;
  new_value: Json | null;
  change_source: CmsChangeSource;
  status: CmsChangeItemStatus;
  selected_for_publish: boolean;
  changed_by: string | null;
  changed_at: string;
  published_at: string | null;
  publish_event_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CmsPublishEvent = {
  id: string;
  published_at: string;
  published_by: string | null;
  summary: string | null;
  affected_pages: string[];
  change_count: number;
  service_ids: string[];
  meta: Json;
  created_at: string;
};

export type CmsPublishHistoryItem = {
  id: string;
  publish_event_id: string;
  entity_type: string;
  entity_id: string | null;
  service_id: string | null;
  plan_id: string | null;
  field_key: string;
  field_label: string | null;
  old_value: Json | null;
  new_value: Json | null;
  change_source: string | null;
  created_at: string;
};

export type ScrapingCandidate = {
  id: string;
  scraping_run_id: string | null;
  service_id: string;
  plan_id: string | null;
  field_key: string;
  field_label: string | null;
  current_published_value: Json | null;
  current_draft_value: Json | null;
  candidate_value: Json | null;
  evidence: string | null;
  source_url: string | null;
  confidence: number | null;
  fetched_at: string;
  status: ScrapingCandidateStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceCampaign = {
  id: string;
  service_id: string;
  name: string;
  summary: string | null;
  target_plan_ids: string[];
  discount_rate: number | null;
  discount_amount: number | null;
  coupon_code: string | null;
  cashback_note: string | null;
  first_month_free: boolean | null;
  ends_on: string | null;
  source_url: string | null;
  publish_status: CmsPublishStatus;
  is_published: boolean;
  has_unpublished_changes: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export const AFFECTED_PAGE_LABELS = [
  "TOP 人気3社比較",
  "TOP レンタルサーバー比較",
  "比較ページ",
  "サービス詳細ページ",
] as const;

export const CMS_SECTIONS = [
  { id: "basic", label: "基本" },
  { id: "plans", label: "プラン" },
  { id: "wordpress", label: "WordPress" },
  { id: "performance", label: "性能" },
  { id: "support", label: "サポート" },
  { id: "security", label: "セキュリティ" },
  { id: "campaigns", label: "キャンペーン" },
  { id: "seo", label: "SEO" },
  { id: "scrape", label: "取得候補" },
] as const;

export type CmsSectionId = (typeof CMS_SECTIONS)[number]["id"];

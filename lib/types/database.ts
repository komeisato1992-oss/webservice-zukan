export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ServiceStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "unpublished"
  | "expired";

export type AffiliateApprovalStatus =
  | "not_applied"
  | "pending"
  | "approved"
  | "rejected"
  | "closed";

export type FieldType = "boolean" | "number" | "text" | "select" | "rating";

export type ComparisonValueSource =
  | "comparison_value"
  | "plan_monthly_price"
  | "plan_initial_fee"
  | "plan_storage";

export type CompareRule = "min" | "max" | "true" | "score";

export type ManagedContentType =
  | "ai_article"
  | "notice"
  | "campaign"
  | "feature";

export type ManagedContentStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "expired"
  | "rejected";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_published: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

export type Service = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  short_name: string | null;
  catchphrase: string | null;
  /** サービス詳細「〇〇とは」本文（一覧取得では省略可） */
  about_text?: string | null;
  logo_url: string | null;
  thumbnail_url: string | null;
  official_url: string | null;
  primary_link_url: string | null;
  /** 本番「公式サイトへ」で official_url より優先（手入力。スクレイピング非対象） */
  affiliate_url?: string | null;
  /** ASP名（A8 等） */
  affiliate_network?: string | null;
  /** active=提携済 / pending=申請中 / inactive=未提携 */
  affiliate_status?: string | null;
  status: ServiceStatus;
  is_published: boolean;
  /** false のとき本サイト全体から非表示（管理画面には残す） */
  is_site_visible?: boolean;
  is_featured: boolean;
  display_order: number;
  editor_score: number | null;
  /** TOP hero「人気3社の比較」初期表示（migration 202607190003） */
  show_in_top_featured_comparison?: boolean;
  /** TOP本文「レンタルサーバーを比較」初期表示（migration 202607190003） */
  show_in_top_comparison?: boolean;
  top_featured_display_order?: number | null;
  top_comparison_display_order?: number | null;
  recommended_uses: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
  company_name?: string | null;
  service_start_year?: number | null;
  datacenter_location?: string | null;
  editor_comment?: string | null;
  overall_score?: number | null;
  suitable_beginner?: boolean | null;
  suitable_blog?: boolean | null;
  suitable_business?: boolean | null;
  suitable_ec?: boolean | null;
  adult_allowed?: boolean | null;
  has_unpublished_changes?: boolean;
  draft_updated_at?: string | null;
  last_published_at?: string | null;
  last_change_source?: string | null;
  /** Optimistic lock for spreadsheet import (added in 202607190002) */
  data_version?: number;
  created_at: string;
  updated_at: string;
};

export type SpreadsheetSyncType =
  | "export_csv"
  | "export_xlsx"
  | "export_sheets"
  | "preview_csv"
  | "preview_xlsx"
  | "preview_sheets"
  | "spreadsheet_export"
  | "spreadsheet_import"
  | "apply"
  | "rollback"
  | "connection_test"
  | "scraping";

export type SpreadsheetSyncSource =
  | "google_sheets"
  | "csv"
  | "xlsx"
  | "manual_admin"
  | "scraping"
  | "system";

export type SpreadsheetSyncStatus =
  | "pending"
  | "running"
  | "success"
  | "partial"
  | "failed"
  | "rolled_back"
  | "fetched"
  | "awaiting_review"
  | "applying"
  | "applied"
  | "cancelled";

export type SpreadsheetChangeType =
  | "changed"
  | "added"
  | "cleared"
  | "error"
  | "conflict"
  | "unchanged";

export type SpreadsheetChangeStatus =
  | "pending"
  | "selected"
  | "applied"
  | "skipped"
  | "error"
  | "rolled_back";

export type SpreadsheetSyncRun = {
  id: string;
  sync_type: SpreadsheetSyncType;
  source: SpreadsheetSyncSource;
  status: SpreadsheetSyncStatus;
  spreadsheet_id?: string | null;
  started_at?: string | null;
  exported_count: number;
  difference_count: number;
  applied_count: number;
  error_count: number;
  total_rows?: number;
  added_count?: number;
  changed_count?: number;
  unchanged_count?: number;
  warning_count?: number;
  target_service_ids: string[];
  message: string | null;
  meta: Json;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  applied_at?: string | null;
  updated_at: string;
};

export type SpreadsheetSyncChange = {
  id: string;
  sync_run_id: string;
  sheet_name?: string | null;
  table_name?: string | null;
  record_id?: string | null;
  record_slug?: string | null;
  service_id: string | null;
  service_slug: string | null;
  service_name: string | null;
  plan_name?: string | null;
  field_name: string;
  old_value: Json | null;
  new_value: Json | null;
  change_type: SpreadsheetChangeType;
  selected?: boolean;
  status: SpreadsheetChangeStatus;
  error_message: string | null;
  warning?: string | null;
  row_number?: number | null;
  applied_at: string | null;
  created_at: string;
};

export type SpreadsheetSyncError = {
  id: string;
  session_id: string;
  sheet_name: string | null;
  row_number: number | null;
  record_id: string | null;
  error_code: string | null;
  message: string;
  raw_data: Json | null;
  created_at: string;
};

export type ServiceFieldOverride = {
  id: string;
  service_id: string;
  field_name: string;
  source_type: "manual" | "scraped" | "imported" | "system";
  manual_override: boolean;
  manual_value: Json | null;
  scraped_value: Json | null;
  last_verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AffiliateLink = {
  id: string;
  service_id: string;
  asp_name: string | null;
  program_name: string | null;
  official_url: string | null;
  affiliate_url: string | null;
  approval_status: AffiliateApprovalStatus;
  reward_note: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  id: string;
  email: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ServicePlan = {
  id: string;
  service_id: string;
  name: string;
  slug: string;
  /** サイト表示用（空なら name から「プラン」付与） */
  display_name?: string | null;
  regular_monthly_price: number | null;
  campaign_monthly_price: number | null;
  effective_monthly_price: number | null;
  initial_fee: number | null;
  billing_period: string | null;
  storage_value: number | null;
  storage_unit: string | null;
  storage_type?: string | null;
  description: string | null;
  display_order: number;
  is_published: boolean;
  /** 比較表の初期表示プラン（サービス内1件） */
  is_default_comparison_plan: boolean;
  /** 推奨プラン（代表未指定時のフォールバック） */
  is_recommended: boolean;
  /** プラン別公式URL（任意） */
  official_url: string | null;
  cpu?: string | null;
  memory?: string | null;
  transfer_amount?: string | null;
  free_trial_days?: number | null;
  /** 文字列（無制限・20個 等） */
  free_domain_count?: string | null;
  /** 文字列（無制限・100個以上 等） */
  multi_domain_count?: string | null;
  /** 文字列（無制限・3個まで 等） */
  database_count?: string | null;
  payment_methods?: string | null;
  min_contract_period?: string | null;
  /** Keys that override service-level comparison values for this plan */
  field_overrides?: Record<string, unknown>;
  publish_status?: ServiceStatus;
  has_unpublished_changes?: boolean;
  created_at: string;
  updated_at: string;
};

export type ComparisonField = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  field_type: FieldType;
  unit: string | null;
  description: string | null;
  display_group: string | null;
  select_options: string[];
  display_order: number;
  is_filterable: boolean;
  is_highlighted: boolean;
  is_published: boolean;
  /** 値の取得元（プラン列 or comparison_values） */
  value_source?: ComparisonValueSource;
  /** 並び替え・最良値判定ルール */
  compare_rule?: CompareRule | null;
  show_in_top_featured?: boolean;
  top_featured_display_order?: number | null;
  show_in_top_table?: boolean;
  top_table_display_order?: number | null;
  show_in_compare_page?: boolean;
  compare_page_display_order?: number | null;
  publish_status?: ServiceStatus;
  has_unpublished_changes?: boolean;
  draft_show_in_top_featured?: boolean | null;
  draft_show_in_top_table?: boolean | null;
  draft_show_in_compare_page?: boolean | null;
  created_at: string;
  updated_at: string;
};

export type ManagedContent = {
  id: string;
  content_type: ManagedContentType;
  title: string;
  summary: string | null;
  body: string | null;
  service_id: string | null;
  source_url: string | null;
  source_type: string | null;
  status: ManagedContentStatus;
  is_checked: boolean;
  priority: number | null;
  published_at: string | null;
  expires_at: string | null;
  scraping_run_id: string | null;
  ai_generated: boolean;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ComparisonValue = {
  id: string;
  service_id: string;
  plan_id: string | null;
  comparison_field_id: string;
  boolean_value: boolean | null;
  number_value: number | null;
  text_value: string | null;
  created_at: string;
  updated_at: string;
};

export type ScrapingRunStatus =
  | "pending"
  | "running"
  | "success"
  | "partial"
  | "failed";

export type ScrapingRun = {
  id: string;
  service_id: string;
  provider: string;
  status: ScrapingRunStatus;
  started_at: string;
  completed_at: string | null;
  source_urls: string[];
  result_json: unknown | null;
  warnings: string[];
  error_message: string | null;
  found_count: number | null;
  missing_count: number | null;
  duration_ms: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BulkScrapingItemStatus =
  | "success"
  | "failed"
  | "unsupported"
  | "running"
  | "pending";

export type BulkScrapingItem = {
  serviceId: string;
  name: string;
  slug: string;
  status: BulkScrapingItemStatus;
  message: string;
  /** 短い失敗理由（タイムアウト等） */
  shortReason?: string | null;
  /** 折りたたみ用の詳細（秘密情報なし） */
  detailMessage?: string | null;
};

export type BulkScrapingJob = {
  id: string;
  started_at: string;
  completed_at: string | null;
  success_count: number;
  failed_count: number;
  unsupported_count: number;
  items: BulkScrapingItem[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type Tables = {
  categories: {
    Row: Category;
    Insert: {
      id?: string;
      name: string;
      slug: string;
      description?: string | null;
      icon?: string | null;
      display_order?: number;
      is_published?: boolean;
      seo_title?: string | null;
      seo_description?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Category>;
    Relationships: [];
  };
  services: {
    Row: Service;
    Insert: {
      id?: string;
      category_id: string;
      name: string;
      slug: string;
      short_name?: string | null;
      catchphrase?: string | null;
      about_text?: string | null;
      logo_url?: string | null;
      thumbnail_url?: string | null;
      official_url?: string | null;
      primary_link_url?: string | null;
      affiliate_url?: string | null;
      affiliate_network?: string | null;
      affiliate_status?: string | null;
      status?: ServiceStatus;
      is_published?: boolean;
      is_featured?: boolean;
      display_order?: number;
      editor_score?: number | null;
      show_in_top_featured_comparison?: boolean;
      show_in_top_comparison?: boolean;
      top_featured_display_order?: number | null;
      top_comparison_display_order?: number | null;
      recommended_uses?: string | null;
      seo_title?: string | null;
      seo_description?: string | null;
      canonical_url?: string | null;
      og_image_url?: string | null;
      data_version?: number;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Service>;
    Relationships: [
      {
        foreignKeyName: "services_category_id_fkey";
        columns: ["category_id"];
        isOneToOne: false;
        referencedRelation: "categories";
        referencedColumns: ["id"];
      },
    ];
  };
  affiliate_links: {
    Row: AffiliateLink;
    Insert: {
      id?: string;
      service_id: string;
      asp_name?: string | null;
      program_name?: string | null;
      official_url?: string | null;
      affiliate_url?: string | null;
      approval_status?: AffiliateApprovalStatus;
      reward_note?: string | null;
      is_primary?: boolean;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<AffiliateLink>;
    Relationships: [
      {
        foreignKeyName: "affiliate_links_service_id_fkey";
        columns: ["service_id"];
        isOneToOne: false;
        referencedRelation: "services";
        referencedColumns: ["id"];
      },
    ];
  };
  admin_users: {
    Row: AdminUser;
    Insert: {
      id: string;
      email: string;
      display_name?: string | null;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<AdminUser>;
    Relationships: [];
  };
  service_plans: {
    Row: ServicePlan;
    Insert: {
      id?: string;
      service_id: string;
      name: string;
      slug: string;
      regular_monthly_price?: number | null;
      campaign_monthly_price?: number | null;
      effective_monthly_price?: number | null;
      initial_fee?: number | null;
      billing_period?: string | null;
      storage_value?: number | null;
      storage_unit?: string | null;
      description?: string | null;
      display_order?: number;
      is_published?: boolean;
      is_default_comparison_plan?: boolean;
      is_recommended?: boolean;
      official_url?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<ServicePlan>;
    Relationships: [
      {
        foreignKeyName: "service_plans_service_id_fkey";
        columns: ["service_id"];
        isOneToOne: false;
        referencedRelation: "services";
        referencedColumns: ["id"];
      },
    ];
  };
  comparison_fields: {
    Row: ComparisonField;
    Insert: {
      id?: string;
      category_id: string;
      name: string;
      slug: string;
      field_type: FieldType;
      unit?: string | null;
      description?: string | null;
      display_group?: string | null;
      select_options?: string[];
      display_order?: number;
      is_filterable?: boolean;
      is_highlighted?: boolean;
      is_published?: boolean;
      value_source?: ComparisonValueSource;
      compare_rule?: CompareRule | null;
      show_in_top_featured?: boolean;
      top_featured_display_order?: number | null;
      show_in_top_table?: boolean;
      top_table_display_order?: number | null;
      show_in_compare_page?: boolean;
      compare_page_display_order?: number | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<ComparisonField>;
    Relationships: [
      {
        foreignKeyName: "comparison_fields_category_id_fkey";
        columns: ["category_id"];
        isOneToOne: false;
        referencedRelation: "categories";
        referencedColumns: ["id"];
      },
    ];
  };
  managed_contents: {
    Row: ManagedContent;
    Insert: {
      id?: string;
      content_type: ManagedContentType;
      title: string;
      summary?: string | null;
      body?: string | null;
      service_id?: string | null;
      source_url?: string | null;
      source_type?: string | null;
      status?: ManagedContentStatus;
      is_checked?: boolean;
      priority?: number | null;
      published_at?: string | null;
      expires_at?: string | null;
      scraping_run_id?: string | null;
      ai_generated?: boolean;
      deleted_at?: string | null;
      created_by?: string | null;
      updated_by?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<ManagedContent>;
    Relationships: [
      {
        foreignKeyName: "managed_contents_service_id_fkey";
        columns: ["service_id"];
        isOneToOne: false;
        referencedRelation: "services";
        referencedColumns: ["id"];
      },
    ];
  };
  comparison_values: {
    Row: ComparisonValue;
    Insert: {
      id?: string;
      service_id: string;
      plan_id?: string | null;
      comparison_field_id: string;
      boolean_value?: boolean | null;
      number_value?: number | null;
      text_value?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<ComparisonValue>;
    Relationships: [
      {
        foreignKeyName: "comparison_values_service_id_fkey";
        columns: ["service_id"];
        isOneToOne: false;
        referencedRelation: "services";
        referencedColumns: ["id"];
      },
      {
        foreignKeyName: "comparison_values_plan_id_fkey";
        columns: ["plan_id"];
        isOneToOne: false;
        referencedRelation: "service_plans";
        referencedColumns: ["id"];
      },
      {
        foreignKeyName: "comparison_values_comparison_field_id_fkey";
        columns: ["comparison_field_id"];
        isOneToOne: false;
        referencedRelation: "comparison_fields";
        referencedColumns: ["id"];
      },
    ];
  };
  scraping_runs: {
    Row: ScrapingRun;
    Insert: {
      id?: string;
      service_id: string;
      provider: string;
      status: ScrapingRunStatus;
      started_at?: string;
      completed_at?: string | null;
      source_urls?: string[];
      result_json?: unknown | null;
      warnings?: string[];
      error_message?: string | null;
      found_count?: number | null;
      missing_count?: number | null;
      duration_ms?: number | null;
      created_by?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<ScrapingRun>;
    Relationships: [
      {
        foreignKeyName: "scraping_runs_service_id_fkey";
        columns: ["service_id"];
        isOneToOne: false;
        referencedRelation: "services";
        referencedColumns: ["id"];
      },
    ];
  };
  bulk_scraping_jobs: {
    Row: BulkScrapingJob;
    Insert: {
      id?: string;
      started_at?: string;
      completed_at?: string | null;
      success_count?: number;
      failed_count?: number;
      unsupported_count?: number;
      items?: BulkScrapingItem[];
      created_by?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<BulkScrapingJob>;
    Relationships: [];
  };
  spreadsheet_sync_runs: {
    Row: SpreadsheetSyncRun;
    Insert: {
      id?: string;
      sync_type: SpreadsheetSyncType;
      source: SpreadsheetSyncSource;
      status?: SpreadsheetSyncStatus;
      spreadsheet_id?: string | null;
      started_at?: string | null;
      exported_count?: number;
      difference_count?: number;
      applied_count?: number;
      error_count?: number;
      total_rows?: number;
      added_count?: number;
      changed_count?: number;
      unchanged_count?: number;
      warning_count?: number;
      target_service_ids?: string[];
      message?: string | null;
      meta?: Json;
      created_by?: string | null;
      created_at?: string;
      completed_at?: string | null;
      applied_at?: string | null;
      updated_at?: string;
    };
    Update: Partial<SpreadsheetSyncRun>;
    Relationships: [];
  };
  spreadsheet_sync_changes: {
    Row: SpreadsheetSyncChange;
    Insert: {
      id?: string;
      sync_run_id: string;
      sheet_name?: string | null;
      table_name?: string | null;
      record_id?: string | null;
      record_slug?: string | null;
      service_id?: string | null;
      service_slug?: string | null;
      service_name?: string | null;
      plan_name?: string | null;
      field_name: string;
      old_value?: Json | null;
      new_value?: Json | null;
      change_type: SpreadsheetChangeType;
      selected?: boolean;
      status?: SpreadsheetChangeStatus;
      error_message?: string | null;
      warning?: string | null;
      row_number?: number | null;
      applied_at?: string | null;
      created_at?: string;
    };
    Update: Partial<SpreadsheetSyncChange>;
    Relationships: [
      {
        foreignKeyName: "spreadsheet_sync_changes_sync_run_id_fkey";
        columns: ["sync_run_id"];
        isOneToOne: false;
        referencedRelation: "spreadsheet_sync_runs";
        referencedColumns: ["id"];
      },
    ];
  };
  spreadsheet_sync_errors: {
    Row: SpreadsheetSyncError;
    Insert: {
      id?: string;
      session_id: string;
      sheet_name?: string | null;
      row_number?: number | null;
      record_id?: string | null;
      error_code?: string | null;
      message: string;
      raw_data?: Json | null;
      created_at?: string;
    };
    Update: Partial<SpreadsheetSyncError>;
    Relationships: [
      {
        foreignKeyName: "spreadsheet_sync_errors_session_id_fkey";
        columns: ["session_id"];
        isOneToOne: false;
        referencedRelation: "spreadsheet_sync_runs";
        referencedColumns: ["id"];
      },
    ];
  };
  service_field_overrides: {
    Row: ServiceFieldOverride;
    Insert: {
      id?: string;
      service_id: string;
      field_name: string;
      source_type?: ServiceFieldOverride["source_type"];
      manual_override?: boolean;
      manual_value?: Json | null;
      scraped_value?: Json | null;
      last_verified_at?: string | null;
      verified_by?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<ServiceFieldOverride>;
    Relationships: [
      {
        foreignKeyName: "service_field_overrides_service_id_fkey";
        columns: ["service_id"];
        isOneToOne: false;
        referencedRelation: "services";
        referencedColumns: ["id"];
      },
    ];
  };
  cms_service_drafts: {
    Row: {
      service_id: string;
      payload: Json;
      published_snapshot: Json | null;
      status: string;
      change_count: number;
      last_change_source: string | null;
      updated_by: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      service_id: string;
      payload?: Json;
      published_snapshot?: Json | null;
      status?: string;
      change_count?: number;
      last_change_source?: string | null;
      updated_by?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<{
      payload: Json;
      published_snapshot: Json | null;
      status: string;
      change_count: number;
      last_change_source: string | null;
      updated_by: string | null;
      updated_at: string;
    }>;
    Relationships: [];
  };
  cms_change_items: {
    Row: {
      id: string;
      entity_type: string;
      entity_id: string | null;
      parent_service_id: string | null;
      parent_plan_id: string | null;
      field_key: string;
      field_label: string | null;
      old_value: Json | null;
      new_value: Json | null;
      change_source: string;
      status: string;
      selected_for_publish: boolean;
      changed_by: string | null;
      changed_at: string;
      published_at: string | null;
      publish_event_id: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      entity_type: string;
      entity_id?: string | null;
      parent_service_id?: string | null;
      parent_plan_id?: string | null;
      field_key: string;
      field_label?: string | null;
      old_value?: Json | null;
      new_value?: Json | null;
      change_source?: string;
      status?: string;
      selected_for_publish?: boolean;
      changed_by?: string | null;
      changed_at?: string;
      published_at?: string | null;
      publish_event_id?: string | null;
    };
    Update: Partial<{
      entity_type: string;
      entity_id: string | null;
      parent_service_id: string | null;
      parent_plan_id: string | null;
      field_key: string;
      field_label: string | null;
      old_value: Json | null;
      new_value: Json | null;
      change_source: string;
      status: string;
      selected_for_publish: boolean;
      changed_by: string | null;
      changed_at: string;
      published_at: string | null;
      publish_event_id: string | null;
    }>;
    Relationships: [];
  };
  cms_publish_events: {
    Row: {
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
    Insert: {
      id?: string;
      published_at?: string;
      published_by?: string | null;
      summary?: string | null;
      affected_pages?: string[];
      change_count?: number;
      service_ids?: string[];
      meta?: Json;
    };
    Update: Partial<{
      summary: string | null;
      affected_pages: string[];
      change_count: number;
      service_ids: string[];
      meta: Json;
    }>;
    Relationships: [];
  };
  cms_publish_history_items: {
    Row: {
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
    Insert: {
      id?: string;
      publish_event_id: string;
      entity_type: string;
      entity_id?: string | null;
      service_id?: string | null;
      plan_id?: string | null;
      field_key: string;
      field_label?: string | null;
      old_value?: Json | null;
      new_value?: Json | null;
      change_source?: string | null;
    };
    Update: Partial<{
      field_label: string | null;
      old_value: Json | null;
      new_value: Json | null;
    }>;
    Relationships: [];
  };
  scraping_candidates: {
    Row: {
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
      status: string;
      reviewed_by: string | null;
      reviewed_at: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      scraping_run_id?: string | null;
      service_id: string;
      plan_id?: string | null;
      field_key: string;
      field_label?: string | null;
      current_published_value?: Json | null;
      current_draft_value?: Json | null;
      candidate_value?: Json | null;
      evidence?: string | null;
      source_url?: string | null;
      confidence?: number | null;
      fetched_at?: string;
      status?: string;
      reviewed_by?: string | null;
      reviewed_at?: string | null;
    };
    Update: Partial<{
      status: string;
      candidate_value: Json | null;
      current_draft_value: Json | null;
      reviewed_by: string | null;
      reviewed_at: string | null;
    }>;
    Relationships: [];
  };
  service_campaigns: {
    Row: {
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
      publish_status: string;
      is_published: boolean;
      has_unpublished_changes: boolean;
      display_order: number;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      service_id: string;
      name: string;
      summary?: string | null;
      target_plan_ids?: string[];
      discount_rate?: number | null;
      discount_amount?: number | null;
      coupon_code?: string | null;
      cashback_note?: string | null;
      first_month_free?: boolean | null;
      ends_on?: string | null;
      source_url?: string | null;
      publish_status?: string;
      is_published?: boolean;
      has_unpublished_changes?: boolean;
      display_order?: number;
    };
    Update: Partial<{
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
      publish_status: string;
      is_published: boolean;
      has_unpublished_changes: boolean;
      display_order: number;
    }>;
    Relationships: [];
  };
};

export type Database = {
  public: {
    Tables: Tables;
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

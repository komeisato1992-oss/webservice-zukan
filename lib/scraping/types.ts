export type ScrapeConfidence = "high" | "medium" | "low";
export type ScrapeFieldStatus =
  | "found"
  | "not_found"
  | "ambiguous"
  | "error";

export type ScrapedField<T = string | number | boolean | null> = {
  key: string;
  label: string;
  value: T | null;
  rawValue?: string | null;
  sourceUrl: string;
  sourceText?: string | null;
  confidence: ScrapeConfidence;
  status: ScrapeFieldStatus;
  warning?: string | null;
  /** 推測・推論の場合 true */
  inferred?: boolean;
};

export type ScrapedPlan = {
  name: ScrapedField<string>;
  slugHint?: string | null;
  /** 公式プランURL（取得できる場合） */
  officialUrl?: ScrapedField<string>;
  regularMonthlyPrice: ScrapedField<number>;
  campaignMonthlyPrice: ScrapedField<number>;
  effectiveMonthlyPrice: ScrapedField<number>;
  initialFee: ScrapedField<number>;
  billingPeriod: ScrapedField<string>;
  minContractPeriod?: ScrapedField<string>;
  freeTrialDays?: ScrapedField<number>;
  storageValue: ScrapedField<number>;
  storageUnit: ScrapedField<string>;
  storageType?: ScrapedField<string>;
  cpu?: ScrapedField<string>;
  memory?: ScrapedField<string>;
  transferAmount?: ScrapedField<string>;
  databaseCount?: ScrapedField<string>;
  multiDomainCount?: ScrapedField<string>;
  freeDomainCount?: ScrapedField<string>;
};

export type ScrapedComparisonValue = ScrapedField<boolean | number | string> & {
  /** comparison_fields.slug と突合 */
  fieldSlug: string;
};

export type ScrapedServiceData = {
  serviceSlug: string;
  provider: string;
  fetchedAt: string;
  sourceUrls: string[];
  plans: ScrapedPlan[];
  comparisonValues: ScrapedComparisonValue[];
  warnings: string[];
  success: boolean;
  errorMessage?: string | null;
  /** サポート抽出などに再利用するページ本文（公開DBには保存しない） */
  pageText?: string | null;
};

export type ScrapeRunStatus =
  | "pending"
  | "running"
  | "success"
  | "partial"
  | "failed";

export type ScraperProviderContext = {
  serviceId: string;
  serviceSlug: string;
  officialUrl: string;
  signal?: AbortSignal;
};

export type ScraperProvider = {
  id: string;
  label: string;
  supportedSlugs: string[];
  scrape: (ctx: ScraperProviderContext) => Promise<ScrapedServiceData>;
};

export type DiffChangeKind =
  | "unchanged"
  | "added"
  | "changed"
  | "ambiguous"
  | "not_found"
  | "error";

export type PlanMatchKind =
  | "slug"
  | "name"
  | "partial"
  | "unmatched";

export type ScrapeDiffItem = {
  id: string;
  group: "plan" | "comparison";
  planName?: string | null;
  planId?: string | null;
  planSlugHint?: string | null;
  planMatchKind?: PlanMatchKind | null;
  /** 既存プランに未一致の新規プラン候補 */
  isNewPlanCandidate?: boolean;
  /** 比較項目が DB 未登録 */
  isMissingComparisonField?: boolean;
  fieldKey: string;
  label: string;
  currentValue: string | null;
  suggestedValue: string | null;
  rawValue?: string | null;
  sourceUrl: string;
  confidence: ScrapeConfidence;
  status: ScrapeFieldStatus;
  changeKind: DiffChangeKind;
  warning?: string | null;
  inferred?: boolean;
  /** フォーム反映用の正規化値 */
  applyValue: string | boolean | number | null;
  fieldSlug?: string | null;
  comparisonFieldId?: string | null;
  selectable: boolean;
};

export function createEmptyField<T>(
  key: string,
  label: string,
  sourceUrl: string,
  overrides: Partial<ScrapedField<T>> = {},
): ScrapedField<T> {
  return {
    key,
    label,
    value: null,
    rawValue: null,
    sourceUrl,
    sourceText: null,
    confidence: "low",
    status: "not_found",
    warning: null,
    inferred: false,
    ...overrides,
  };
}

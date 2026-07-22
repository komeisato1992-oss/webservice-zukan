import type { Page } from "playwright";
import type {
  ScrapedComparisonValue,
  ScrapedPlan,
  ScraperProvider,
} from "@/lib/scraping/types";

/** ページから抽出した正規化済みマトリクス */
export type ExtractedMatrix = {
  /** プラン名（列ヘッダー） */
  planNames: string[];
  /** 行ラベル → プラン列の値 */
  rows: Record<string, string[]>;
  /** 契約期間行など（ラベル正規化済み） */
  periodRows: Record<string, string[]>;
  pageText: string;
  sourceUrl: string;
};

export type ExtractedCard = {
  name: string;
  bodyText: string;
  monthlyRaw?: string | null;
  storageRaw?: string | null;
  initialRaw?: string | null;
};

export type ExtractedCards = {
  cards: ExtractedCard[];
  pageText: string;
  sourceUrl: string;
};

export type PageData = ExtractedMatrix | ExtractedCards | Record<string, unknown>;

export type InteractiveStep =
  | { type: "click-text"; textIncludes: string; within?: string }
  | { type: "wait-ms"; ms: number };

export type BooleanCellMode =
  | "mark-text"
  | "img-alt"
  | "ok-class"
  | "icon-or-mark";

export type PriceRuleId =
  | "single-yen"
  | "dual-struck-campaign"
  | "dual-campaign-renewal"
  | "tax-incl-campaign-renewal"
  | "paren-monthly-equivalent"
  | "period-total-to-monthly";

export type TableExtractConfig = {
  type: "tables";
  /** 0-based。未指定なら全テーブルをマージ */
  tableIndexes?: number[];
  headerRow?: number;
  /** ヘッダー先頭セルもプラン名（ラベル列なし） */
  headerHasNoLabelColumn?: boolean;
  /** ヘッダーセルのプラン名フィルタ */
  headerFilter?: RegExp;
  /** 先頭列が期間ラベルの料金表 */
  periodInFirstColumn?: boolean;
  booleanMode?: BooleanCellMode;
  /** 列が契約期間で、単一プランとして扱う */
  columnsAsPeriods?: boolean;
  singlePlanName?: string;
  /**
   * 行がプラン（先頭列＝プラン名、ヘッダー＝項目名）の表。
   * VPS 従量課金表などで使用。
   */
  rowsAsPlans?: boolean;
};

export type CardsExtractConfig = {
  type: "cards";
  unitSelector: string;
  nameSelector?: string;
  nameWhitelist?: string[];
  nameRegex?: string;
};

export type HandlerExtractConfig = {
  type: "handler";
  name: string;
};

export type ExtractConfig =
  | TableExtractConfig
  | CardsExtractConfig
  | HandlerExtractConfig;

export type ScraperPageDef = {
  id: string;
  /** 相対パス or 絶対URL */
  path: string;
  role: "price" | "features" | "both";
  required?: boolean;
  waitFor?: { selector: string; state?: "attached" | "visible" };
  before?: InteractiveStep[];
  extract: ExtractConfig;
  /** テーブル抽出失敗時のカード抽出フォールバック */
  fallbackCards?: CardsExtractConfig;
};

export type PlanFieldConfig = {
  /** 代表契約期間のヒント */
  periodHints: string[];
  periodFallbackHints?: string[];
  billingPeriodLabel?: string;
  priceRule: PriceRuleId;
  /** 価格行ラベルに含める語（periodInFirstColumn でない場合） */
  priceRowIncludes?: string[];
  initialFeeIncludes?: string[];
  diskIncludes?: string[];
  defaultInitialFee?: number | null;
  /** キャンペーンを ambiguous 扱いにする */
  campaignAmbiguous?: boolean;
  effectiveAmbiguous?: boolean;
  /** プラン名の正規化 whitelist（カード時） */
  planWhitelist?: string[];
};

export type ComparisonMapping = {
  fieldSlug: string;
  label: string;
  /** 行ラベルに含まれる語（AND） */
  rowIncludes: string[];
  valueType: "boolean" | "number" | "string";
  /** boolean 集約: all / some / first */
  aggregate?: "all" | "some" | "first";
  parse?: "days" | "storage-media" | "raw";
  pageTextFallback?: RegExp;
  inferred?: boolean;
  warning?: string;
};

export type ScrapeRuntimeOptions = {
  /** 個別 navigation timeout（共通値より長くしてよい） */
  navigationTimeoutMs?: number;
  /** 個別 action timeout */
  actionTimeoutMs?: number;
  /** 画像・動画・フォント等をブロックして読み込みを軽くする */
  blockHeavyResources?: boolean;
  /** Cookie同意などのボタン文言（部分一致） */
  dismissCookieTextIncludes?: string[];
  /**
   * 旧公式ドメインが死んでいる場合などに、
   * パス解決用の正規オリジンへ書き換える。
   */
  rewriteOfficialOrigin?: string;
  /** rewrite 対象ホスト（部分一致ではなく hostname 一致 / サブドメイン） */
  rewriteFromHosts?: string[];
  /** 主 path 失敗時に試す相対/絶対URL */
  alternatePaths?: string[];
};

export type ScraperDefinition = {
  id: string;
  label: string;
  supportedSlugs: string[];
  allowedHosts: string[];
  pages: ScraperPageDef[];
  plan: PlanFieldConfig;
  comparisons: ComparisonMapping[];
  warnings?: string[];
  scrapeOptions?: ScrapeRuntimeOptions;
  /**
   * 特殊ルール: エンジン標準で足りない場合のみ。
   * handler 名は engine/handlers に実装。
   */
  special?: {
    /** 完全カスタム scrape（ページ遷移以外も自前） */
    fullHandler?: string;
    /** 抽出後の plans/comparisons 補正 */
    afterBuild?: string;
  };
};

export type HandlerContext = {
  page: Page;
  officialUrl: string;
  pageDef: ScraperPageDef;
  sourceUrl: string;
};

export type FullHandler = (args: {
  officialUrl: string;
  serviceSlug: string;
  definition: ScraperDefinition;
}) => Promise<{
  plans: ScrapedPlan[];
  comparisonValues: ScrapedComparisonValue[];
  sourceUrls: string[];
  warnings: string[];
  pageText?: string | null;
}>;

export type ExtractHandler = (
  ctx: HandlerContext,
) => Promise<PageData>;

export type AfterBuildHandler = (args: {
  plans: ScrapedPlan[];
  comparisonValues: ScrapedComparisonValue[];
  pageData: Record<string, PageData>;
  definition: ScraperDefinition;
}) => {
  plans: ScrapedPlan[];
  comparisonValues: ScrapedComparisonValue[];
  warnings?: string[];
};

export type DefinitionProviderFactory = (
  def: ScraperDefinition,
) => ScraperProvider;

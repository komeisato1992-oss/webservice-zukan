import type { ScraperDefinition } from "@/lib/scraping/engine/types";

export const kagoyaDefinition: ScraperDefinition = {
  id: "kagoya",
  label: "KAGOYA",
  supportedSlugs: ["kagoya"],
  allowedHosts: ["kagoya.jp"],
  pages: [
    {
      id: "price",
      path: "https://www.kagoya.jp/kir/price",
      role: "both",
      extract: {
        type: "tables",
        tableIndexes: [0, 1],
        headerRow: 1,
        headerHasNoLabelColumn: true,
        periodInFirstColumn: true,
      },
    },
  ],
  plan: {
    periodHints: ["12ヶ月一括"],
    periodFallbackHints: ["1ヶ月毎月", "1ヶ月"],
    billingPeriodLabel: "12ヶ月",
    priceRule: "paren-monthly-equivalent",
    initialFeeIncludes: ["初期費用"],
    diskIncludes: ["ストレージ容量"],
    campaignAmbiguous: true,
  },
  comparisons: [
    {
      fieldSlug: "free-ssl",
      label: "無料SSL",
      rowIncludes: ["SSL"],
      valueType: "boolean",
      pageTextFallback: /SSL|Let's Encrypt|無料/,
      inferred: true,
    },
    {
      fieldSlug: "wordpress-easy-install",
      label: "WordPress簡単インストール",
      rowIncludes: ["WordPress"],
      valueType: "boolean",
      pageTextFallback: /WordPress/,
      inferred: true,
    },
    {
      fieldSlug: "automatic-backup",
      label: "自動バックアップ",
      rowIncludes: ["バックアップ"],
      valueType: "boolean",
      pageTextFallback: /バックアップ/,
      inferred: true,
    },
    {
      fieldSlug: "storage-type",
      label: "ストレージ種別",
      rowIncludes: ["ストレージ容量"],
      valueType: "string",
      parse: "storage-media",
    },
  ],
  warnings: [
    "KAGOYA Internet Routing の料金表から取得。12ヶ月一括の月額換算（括弧内）を優先します。",
  ],
};

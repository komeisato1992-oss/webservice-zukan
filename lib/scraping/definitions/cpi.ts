import type { ScraperDefinition } from "@/lib/scraping/engine/types";

export const cpiDefinition: ScraperDefinition = {
  id: "cpi",
  label: "CPI",
  supportedSlugs: ["cpi"],
  allowedHosts: ["cpi.ad.jp"],
  pages: [
    {
      id: "price",
      path: "/shared/bs/price/",
      role: "price",
      extract: {
        type: "tables",
        tableIndexes: [0],
        columnsAsPeriods: true,
        singlePlanName: "ビジネススタンダード",
      },
    },
    {
      id: "spec",
      path: "/shared/bs/spec/",
      role: "features",
      required: false,
      extract: { type: "tables", tableIndexes: [0] },
    },
  ],
  plan: {
    periodHints: ["12ヶ月"],
    periodFallbackHints: ["6ヶ月", "3ヶ月"],
    billingPeriodLabel: "12ヶ月",
    priceRule: "single-yen",
    priceRowIncludes: ["月額換算"],
    initialFeeIncludes: ["初期費用"],
    diskIncludes: ["ディスク容量"],
    campaignAmbiguous: true,
  },
  comparisons: [
    {
      fieldSlug: "free-ssl",
      label: "無料SSL",
      rowIncludes: ["SSL"],
      valueType: "boolean",
      pageTextFallback: /無料|SSL/,
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
      rowIncludes: ["SmartRelease", "バックアップ"],
      valueType: "boolean",
      pageTextFallback: /自動バックアップ|SmartRelease/,
    },
    {
      fieldSlug: "storage-type",
      label: "ストレージ種別",
      rowIncludes: ["ディスク容量"],
      valueType: "string",
      parse: "storage-media",
    },
  ],
  warnings: [
    "CPI ビジネススタンダードの12ヶ月契約・月額換算を代表値として取得します。",
  ],
};

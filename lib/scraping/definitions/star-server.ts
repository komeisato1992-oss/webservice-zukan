import type { ScraperDefinition } from "@/lib/scraping/engine/types";

export const starServerDefinition: ScraperDefinition = {
  id: "star-server",
  label: "スターサーバー",
  supportedSlugs: ["star-server"],
  allowedHosts: ["star.ne.jp"],
  pages: [
    {
      id: "price",
      path: "/price/",
      role: "both",
      extract: {
        type: "tables",
        tableIndexes: [0],
        periodInFirstColumn: true,
      },
    },
  ],
  plan: {
    periodHints: ["36ヶ月"],
    periodFallbackHints: ["24ヶ月", "12ヶ月"],
    billingPeriodLabel: "36ヶ月",
    priceRule: "single-yen",
    initialFeeIncludes: ["初期費用"],
    defaultInitialFee: 0,
    diskIncludes: ["容量"],
    campaignAmbiguous: true,
  },
  comparisons: [
    {
      fieldSlug: "free-ssl",
      label: "無料SSL",
      rowIncludes: ["SSL"],
      valueType: "boolean",
      pageTextFallback: /無料独自SSL|独自SSL/,
    },
    {
      fieldSlug: "wordpress-easy-install",
      label: "WordPress簡単インストール",
      rowIncludes: ["WordPress"],
      valueType: "boolean",
      pageTextFallback: /WordPress/,
    },
    {
      fieldSlug: "automatic-backup",
      label: "自動バックアップ",
      rowIncludes: ["バックアップ"],
      valueType: "boolean",
      pageTextFallback: /自動バックアップ/,
    },
    {
      fieldSlug: "storage-type",
      label: "ストレージ種別",
      rowIncludes: ["容量"],
      valueType: "string",
      parse: "storage-media",
      pageTextFallback: /NVMe|SSD/,
    },
  ],
  warnings: [
    "スターサーバーのライト／スタンダード／ビジネスの36ヶ月契約・月額を代表値として取得します。",
  ],
};

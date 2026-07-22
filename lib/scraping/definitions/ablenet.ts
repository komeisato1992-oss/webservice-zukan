import type { ScraperDefinition } from "@/lib/scraping/engine/types";

export const ablenetDefinition: ScraperDefinition = {
  id: "ablenet",
  label: "ABLENET",
  supportedSlugs: ["ablenet"],
  allowedHosts: ["ablenet.jp"],
  pages: [
    {
      id: "price",
      path: "/rentalserver/plan/index.html",
      role: "both",
      extract: {
        type: "tables",
        tableIndexes: [0],
        periodInFirstColumn: true,
      },
    },
  ],
  plan: {
    periodHints: ["3年払い"],
    periodFallbackHints: ["2年払い", "年払い", "月払い"],
    billingPeriodLabel: "36ヶ月",
    /** 「17,460円485円」形式: 後者が月額換算 */
    priceRule: "dual-campaign-renewal",
    initialFeeIncludes: ["初期費用"],
    defaultInitialFee: 0,
    diskIncludes: ["SSD"],
    campaignAmbiguous: true,
  },
  comparisons: [
    {
      fieldSlug: "free-ssl",
      label: "無料SSL",
      rowIncludes: ["SSL"],
      valueType: "boolean",
      pageTextFallback: /無料SSL|独自SSL|SSL/,
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
      rowIncludes: ["SSD"],
      valueType: "string",
      parse: "storage-media",
      pageTextFallback: /SSD/,
    },
  ],
  warnings: [
    "ABLENET のライト／スタンダード／プレミアムの3年払い・月額換算を代表値として取得します。",
  ],
};

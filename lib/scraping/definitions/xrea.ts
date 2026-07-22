import type { ScraperDefinition } from "@/lib/scraping/engine/types";

export const xreaDefinition: ScraperDefinition = {
  id: "xrea",
  label: "XREA",
  supportedSlugs: ["xrea"],
  allowedHosts: ["xrea.com"],
  pages: [
    {
      id: "price",
      path: "/plan/",
      role: "both",
      extract: {
        type: "tables",
        tableIndexes: [0, 1],
        periodInFirstColumn: true,
      },
    },
  ],
  plan: {
    /** 36ヶ月月額行は Free 列が欠けるため、列が揃う1ヶ月契約を採用 */
    periodHints: ["1ヶ月"],
    periodFallbackHints: ["12ヶ月", "36ヶ月"],
    billingPeriodLabel: "1ヶ月",
    priceRule: "single-yen",
    initialFeeIncludes: ["初期費用"],
    defaultInitialFee: 0,
    campaignAmbiguous: true,
  },
  comparisons: [
    {
      fieldSlug: "free-ssl",
      label: "無料SSL",
      rowIncludes: ["SSL"],
      valueType: "boolean",
      pageTextFallback: /無料SSL|独自SSL|Let's Encrypt/,
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
    },
  ],
  warnings: [
    "XREA Free / Plus / Mail＆Backup の1ヶ月契約料金を代表値として取得します（36ヶ月月額換算行はFree列欠落のため不使用）。",
  ],
};

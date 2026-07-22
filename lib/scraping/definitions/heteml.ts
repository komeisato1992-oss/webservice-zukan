import type { ScraperDefinition } from "@/lib/scraping/engine/types";

export const hetemlDefinition: ScraperDefinition = {
  id: "heteml",
  label: "heteml",
  supportedSlugs: ["heteml"],
  allowedHosts: ["heteml.jp"],
  pages: [
    {
      id: "price",
      path: "/service/charge/",
      role: "both",
      extract: {
        type: "tables",
        tableIndexes: [0],
        columnsAsPeriods: true,
        singlePlanName: "heteml",
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
      rowIncludes: ["簡単インストール"],
      valueType: "boolean",
      pageTextFallback: /簡単インストール|WordPress/,
      inferred: true,
    },
    {
      fieldSlug: "automatic-backup",
      label: "自動バックアップ",
      rowIncludes: ["バックアップ"],
      valueType: "boolean",
      pageTextFallback: /自動バックアップ/,
    },
    {
      fieldSlug: "phone-support",
      label: "電話サポート",
      rowIncludes: ["電話"],
      valueType: "boolean",
      pageTextFallback: /電話サポート/,
    },
    {
      fieldSlug: "email-support",
      label: "メールサポート",
      rowIncludes: ["メール"],
      valueType: "boolean",
      pageTextFallback: /メールサポート|メールでのお問い合わせ/,
    },
    {
      fieldSlug: "chat-support",
      label: "チャットサポート",
      rowIncludes: ["チャット"],
      valueType: "boolean",
      pageTextFallback: /チャットサポート|ライブチャット/,
    },
    {
      fieldSlug: "storage-type",
      label: "ストレージ種別",
      rowIncludes: ["SSD", "容量"],
      valueType: "string",
      parse: "storage-media",
      pageTextFallback: /SSD/,
    },
  ],
  warnings: [
    "hetemlは単一プラン構成のため、契約期間列（36ヶ月）の月額を代表値とします。容量600GBはページ訴求から別途確認してください。",
  ],
  special: { afterBuild: "heteml-storage" },
};

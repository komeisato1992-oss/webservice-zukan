import type { ScraperDefinition } from "@/lib/scraping/engine/types";

export const onamaeDefinition: ScraperDefinition = {
  id: "onamae",
  label: "お名前.com レンタルサーバー",
  supportedSlugs: ["onamae"],
  allowedHosts: ["onamae-server.com", "onamae.com"],
  pages: [
    {
      id: "price",
      path: "https://www.onamae.com/server/rs/price/",
      role: "price",
      extract: { type: "handler", name: "onamae-price" },
    },
    {
      id: "features",
      path: "https://www.onamae.com/server/rs/function/",
      role: "features",
      required: false,
      extract: { type: "handler", name: "onamae-features" },
    },
  ],
  plan: {
    periodHints: ["36ヶ月"],
    periodFallbackHints: ["12ヶ月", "24ヶ月"],
    billingPeriodLabel: "36ヶ月",
    priceRule: "period-total-to-monthly",
    diskIncludes: ["容量（SSD）", "ディスク容量"],
    defaultInitialFee: 0,
    campaignAmbiguous: true,
  },
  comparisons: [
    {
      fieldSlug: "free-ssl",
      label: "無料SSL",
      rowIncludes: ["独自SSL"],
      valueType: "boolean",
      pageTextFallback: /アルファSSL|無料.*SSL|標準搭載/,
    },
    {
      fieldSlug: "wordpress-easy-install",
      label: "WordPress簡単インストール",
      rowIncludes: ["WordPressかんたんインストール"],
      valueType: "boolean",
      pageTextFallback: /WordPressかんたんインストール|WordPress/,
      inferred: true,
    },
    {
      fieldSlug: "automatic-backup",
      label: "自動バックアップ",
      rowIncludes: ["バックアップ"],
      valueType: "boolean",
      pageTextFallback: /バックアップ/,
    },
    {
      fieldSlug: "backup-retention-days",
      label: "バックアップ保持日数",
      rowIncludes: ["バックアップ"],
      valueType: "number",
      parse: "days",
    },
    {
      fieldSlug: "email-support",
      label: "メールサポート",
      rowIncludes: ["サポート"],
      valueType: "boolean",
      pageTextFallback: /メール/,
      inferred: true,
    },
    {
      fieldSlug: "storage-type",
      label: "ストレージ種別",
      rowIncludes: ["ディスク", "SSD"],
      valueType: "string",
      parse: "storage-media",
    },
  ],
  warnings: [
    "お名前.comは単一プラン想定で、36ヶ月払いの月額換算を代表値として取得します。",
  ],
};

import type { ScraperDefinition } from "@/lib/scraping/engine/types";

export const rakkoServerDefinition: ScraperDefinition = {
  id: "rakko-server",
  label: "ラッコサーバー",
  supportedSlugs: ["rakko-server"],
  allowedHosts: ["rakkoserver.com"],
  pages: [
    {
      id: "price-cards",
      path: "/price",
      role: "price",
      before: [{ type: "click-text", textIncludes: "36ヶ月契約" }],
      extract: { type: "handler", name: "rakko-cards" },
    },
    {
      id: "features",
      path: "/price",
      role: "features",
      extract: { type: "handler", name: "rakko-features" },
    },
  ],
  plan: {
    periodHints: ["36ヶ月"],
    billingPeriodLabel: "36ヶ月",
    priceRule: "single-yen",
    defaultInitialFee: 0,
    planWhitelist: ["RK1", "RK2", "RK3"],
    campaignAmbiguous: true,
  },
  comparisons: [
    {
      fieldSlug: "free-ssl",
      label: "無料SSL",
      rowIncludes: ["無料独自SSL"],
      valueType: "boolean",
      aggregate: "all",
      pageTextFallback: /無料独自SSL|独自無料SSL/,
    },
    {
      fieldSlug: "wordpress-easy-install",
      label: "WordPress簡単インストール",
      rowIncludes: ["WordPress自動インストール"],
      valueType: "boolean",
      aggregate: "all",
      pageTextFallback: /WordPress自動インストール|WordPress/,
    },
    {
      fieldSlug: "automatic-backup",
      label: "自動バックアップ",
      rowIncludes: ["自動バックアップ"],
      valueType: "boolean",
      pageTextFallback: /自動バックアップ/,
    },
    {
      fieldSlug: "backup-retention-days",
      label: "バックアップ保持日数",
      rowIncludes: ["自動バックアップ"],
      valueType: "number",
      parse: "days",
    },
    {
      fieldSlug: "email-support",
      label: "メールサポート",
      rowIncludes: ["カスタマーサポート"],
      valueType: "boolean",
      pageTextFallback: /お問い合わせ/,
      inferred: true,
    },
    {
      fieldSlug: "chat-support",
      label: "チャットサポート",
      rowIncludes: ["チャット"],
      valueType: "boolean",
      pageTextFallback: /チャットサポート|ライブチャット|チャットボット/,
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
    "ラッコサーバーは36ヶ月契約タブのカード料金を代表値として取得します。",
  ],
};

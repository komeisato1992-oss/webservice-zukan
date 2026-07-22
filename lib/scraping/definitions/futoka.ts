import type { ScraperDefinition } from "@/lib/scraping/engine/types";

/**
 * FUTOKA
 *
 * 失敗原因（実測）:
 * - `https://www.futoka.jp/?mode=price` が navigation timeout（40s超）
 * - DNS 解決失敗（ERR_NAME_NOT_RESOLVED）が間欠発生
 * - 公開情報では 2025-03-31 サービス終了。サイト応答が不安定/不通
 *
 * 料金を捏造せず、接続できない場合は安全に失敗する。
 * タイムアウトのみ個別延長し、共通値は変更しない。
 */
export const futokaDefinition: ScraperDefinition = {
  id: "futoka",
  label: "FUTOKA",
  supportedSlugs: ["futoka"],
  allowedHosts: ["futoka.jp"],
  scrapeOptions: {
    navigationTimeoutMs: 50_000,
    actionTimeoutMs: 30_000,
    blockHeavyResources: true,
    alternatePaths: ["/?mode=price", "/"],
  },
  pages: [
    {
      id: "price",
      path: "/?mode=price",
      role: "both",
      waitFor: { selector: "table, .plan, .price", state: "attached" },
      extract: {
        type: "tables",
        tableIndexes: [0],
        headerFilter: /SSD/,
        periodInFirstColumn: true,
      },
      fallbackCards: {
        type: "cards",
        unitSelector: ".plan, .price-box, .card, article",
        nameRegex: "SSD|プレミアム|スタンダード|プラチナ|ライト",
      },
    },
  ],
  plan: {
    periodHints: ["12ヶ月"],
    periodFallbackHints: ["6ヶ月", "3ヶ月", "1ヶ月"],
    billingPeriodLabel: "12ヶ月",
    priceRule: "single-yen",
    initialFeeIncludes: ["初期費用"],
    diskIncludes: ["容量", "ディスク"],
    campaignAmbiguous: true,
  },
  comparisons: [
    {
      fieldSlug: "free-ssl",
      label: "無料SSL",
      rowIncludes: ["SSL"],
      valueType: "boolean",
      pageTextFallback: /無料独自SSL|独自SSL/,
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
      fieldSlug: "phone-support",
      label: "電話サポート",
      rowIncludes: ["電話"],
      valueType: "boolean",
      pageTextFallback: /電話サポート/,
      inferred: true,
    },
    {
      fieldSlug: "email-support",
      label: "メールサポート",
      rowIncludes: ["メール"],
      valueType: "boolean",
      pageTextFallback: /メールサポート|お問い合わせ/,
      inferred: true,
    },
    {
      fieldSlug: "chat-support",
      label: "チャットサポート",
      rowIncludes: ["チャット"],
      valueType: "boolean",
      pageTextFallback: /チャットサポート|ライブチャット/,
      inferred: true,
    },
    {
      fieldSlug: "storage-type",
      label: "ストレージ種別",
      rowIncludes: ["容量", "SSD"],
      valueType: "string",
      parse: "storage-media",
      pageTextFallback: /SSD/,
    },
  ],
  warnings: [
    "FUTOKA のSSDプラン（12ヶ月契約）を代表値として取得します。公式サイト不通・サービス終了時は取得失敗とします。",
  ],
  special: {
    fullHandler: "futoka",
  },
};

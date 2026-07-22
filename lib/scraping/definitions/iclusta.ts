import type { ScraperDefinition } from "@/lib/scraping/engine/types";

/**
 * iCLUSTA+（GMOクラウド共有サーバー）
 *
 * 失敗原因（実測）:
 * - DB登録の公式URL `https://shared-server.net/` は DNS 解決不能
 * - 現行サイトは `https://shared.gmocloud.com/iclusta/price/`
 */
export const iclustaDefinition: ScraperDefinition = {
  id: "iclusta",
  label: "iCLUSTA+",
  supportedSlugs: ["iclusta"],
  allowedHosts: [
    "gmocloud.com",
    "shared.gmocloud.com",
    "shared-server.net",
  ],
  scrapeOptions: {
    rewriteFromHosts: ["shared-server.net"],
    rewriteOfficialOrigin: "https://shared.gmocloud.com/",
    dismissCookieTextIncludes: ["同意", "許可する", "閉じる"],
    alternatePaths: [
      "https://shared.gmocloud.com/iclusta/price/",
      "/iclusta/price/",
    ],
  },
  pages: [
    {
      id: "price",
      path: "https://shared.gmocloud.com/iclusta/price/",
      role: "both",
      waitFor: { selector: "table" },
      extract: {
        type: "tables",
        tableIndexes: [0],
        periodInFirstColumn: true,
      },
      fallbackCards: {
        type: "cards",
        unitSelector: ".plan, .price-box, .c-card, article",
        nameWhitelist: ["ミニ", "レギュラー", "プロ"],
      },
    },
  ],
  plan: {
    periodHints: ["36カ月"],
    periodFallbackHints: ["24カ月", "12カ月", "1カ月"],
    billingPeriodLabel: "36ヶ月",
    priceRule: "single-yen",
    initialFeeIncludes: ["初期設定"],
    diskIncludes: ["ディスク", "容量"],
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
      inferred: true,
    },
    {
      fieldSlug: "storage-type",
      label: "ストレージ種別",
      rowIncludes: ["ディスク", "SSD"],
      valueType: "string",
      parse: "storage-media",
      pageTextFallback: /SSD/,
    },
  ],
  warnings: [
    "iCLUSTA+（GMOクラウド）のミニ／レギュラー／プロの36カ月契約・月額を代表値として取得します。",
  ],
};

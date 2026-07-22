import type { ScraperDefinition } from "@/lib/scraping/engine/types";

export const zenlogicDefinition: ScraperDefinition = {
  id: "zenlogic",
  label: "Zenlogic",
  supportedSlugs: ["zenlogic"],
  allowedHosts: ["idcf.jp"],
  pages: [
    {
      id: "price",
      path: "/rentalserver/server/price/",
      role: "both",
      extract: {
        type: "tables",
        tableIndexes: [0],
        headerFilter: /^IC-/,
        periodInFirstColumn: true,
      },
    },
  ],
  plan: {
    periodHints: ["12ヶ月"],
    periodFallbackHints: ["1ヶ月"],
    billingPeriodLabel: "12ヶ月",
    priceRule: "single-yen",
    initialFeeIncludes: ["初期費用"],
    defaultInitialFee: 0,
    diskIncludes: ["ディスク"],
    campaignAmbiguous: true,
  },
  comparisons: [
    {
      fieldSlug: "free-ssl",
      label: "無料SSL",
      rowIncludes: ["SSL", "TLS"],
      valueType: "boolean",
      pageTextFallback: /TLS|SSL|無料/,
      inferred: true,
    },
    {
      fieldSlug: "automatic-backup",
      label: "自動バックアップ",
      rowIncludes: ["バックアップ"],
      valueType: "boolean",
      pageTextFallback: /バックアップ|外部バックアップ/,
    },
    {
      fieldSlug: "email-support",
      label: "メールサポート",
      rowIncludes: ["メール"],
      valueType: "boolean",
      pageTextFallback: /メール/,
      inferred: true,
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
      rowIncludes: ["ディスク"],
      valueType: "string",
      parse: "storage-media",
    },
  ],
  warnings: [
    "Zenlogic ICシリーズ（IC-1〜IC-4）の12ヶ月契約・月額換算を代表値として取得します。",
  ],
};

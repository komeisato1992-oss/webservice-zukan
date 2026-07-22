import type { ScraperDefinition } from "@/lib/scraping/engine/types";

export const coreserverDefinition: ScraperDefinition = {
  id: "coreserver",
  label: "CoreServer",
  supportedSlugs: ["coreserver"],
  allowedHosts: ["coreserver.jp"],
  pages: [
    {
      id: "price",
      path: "/price/",
      role: "both",
      extract: {
        type: "tables",
        tableIndexes: [0, 1],
        headerFilter: /^CORE-/,
        periodInFirstColumn: true,
      },
    },
    {
      id: "spec",
      path: "/spec/",
      role: "features",
      required: false,
      extract: { type: "tables" },
    },
  ],
  plan: {
    periodHints: ["36ヶ月"],
    periodFallbackHints: ["24ヶ月", "12ヶ月"],
    billingPeriodLabel: "36ヶ月",
    priceRule: "single-yen",
    initialFeeIncludes: ["初期費用"],
    diskIncludes: ["ストレージ", "ディスク"],
    campaignAmbiguous: true,
  },
  comparisons: [
    {
      fieldSlug: "free-ssl",
      label: "無料SSL",
      rowIncludes: ["無料SSL"],
      valueType: "boolean",
      pageTextFallback: /無料SSL|Let's Encrypt|SSL/,
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
    {
      fieldSlug: "litespeed",
      label: "LiteSpeed",
      rowIncludes: ["LiteSpeed", "Webサーバー"],
      valueType: "boolean",
      pageTextFallback: /LiteSpeed/,
    },
    {
      fieldSlug: "storage-type",
      label: "ストレージ種別",
      rowIncludes: ["ストレージ"],
      valueType: "string",
      parse: "storage-media",
    },
  ],
  warnings: [
    "CoreServer V2（CORE-X/Y/Z）の月額換算表（36ヶ月）を代表値として取得します。",
  ],
};

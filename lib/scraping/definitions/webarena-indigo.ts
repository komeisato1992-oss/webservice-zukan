import type { ScraperDefinition } from "@/lib/scraping/engine/types";

export const webarenaIndigoDefinition: ScraperDefinition = {
  id: "webarena-indigo",
  label: "WebARENA Indigo",
  supportedSlugs: ["webarena-indigo"],
  allowedHosts: ["arena.ne.jp", "web.arena.ne.jp"],
  pages: [
    {
      id: "price",
      path: "/indigo/price/",
      role: "both",
      extract: {
        type: "tables",
        tableIndexes: [0],
        rowsAsPlans: true,
      },
    },
  ],
  plan: {
    periodHints: ["月額上限"],
    billingPeriodLabel: "月額上限",
    priceRule: "single-yen",
    priceRowIncludes: ["月額上限"],
    diskIncludes: ["SSD"],
    campaignAmbiguous: true,
  },
  comparisons: [
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
    "WebARENA Indigo は従量課金VPSです。メモリ別プランの月額上限料金（税抜）を代表値として取得します。",
  ],
};

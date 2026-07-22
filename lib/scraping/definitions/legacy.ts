import type { ScraperDefinition } from "@/lib/scraping/engine/types";

/** 既存実装をフルハンドラ経由で共通ランタイムに載せる薄い定義 */
function legacyDef(
  id: string,
  label: string,
  slugs: string[],
  hosts: string[],
): ScraperDefinition {
  return {
    id,
    label,
    supportedSlugs: slugs,
    allowedHosts: hosts,
    pages: [],
    plan: {
      periodHints: ["36"],
      priceRule: "single-yen",
    },
    comparisons: [],
    special: { fullHandler: id },
  };
}

export const xserverDefinition = legacyDef(
  "xserver",
  "エックスサーバー",
  ["xserver"],
  ["xserver.ne.jp"],
);

export const conohaWingDefinition = legacyDef(
  "conoha-wing",
  "ConoHa WING",
  ["conoha-wing", "conoha"],
  ["conoha.jp"],
);

export const shinServerDefinition = legacyDef(
  "shin-server",
  "シンレンタルサーバー",
  ["shin-server"],
  ["shin-server.jp"],
);

export const lolipopDefinition = legacyDef(
  "lolipop",
  "ロリポップ！",
  ["lolipop"],
  ["lolipop.jp"],
);

export const mixhostDefinition = legacyDef(
  "mixhost",
  "mixhost",
  ["mixhost"],
  ["mixhost.jp"],
);

export const sakuraDefinition = legacyDef(
  "sakura",
  "さくらのレンタルサーバ",
  ["sakura"],
  ["rs.sakura.ad.jp", "sakura.ad.jp"],
);

export const colorfulBoxDefinition = legacyDef(
  "colorfulbox",
  "ColorfulBox",
  ["colorfulbox"],
  ["colorfulbox.jp"],
);

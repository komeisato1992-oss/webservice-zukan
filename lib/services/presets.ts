/**
 * サービス追加時の候補プリセット。
 * DBには保存せず、運営の登録作業を短縮するための静的カタログ。
 * 新規社追加時はこの配列に1件足す（スクレイパー対応なら catalog.ts にも追加）。
 * Phase2 一括登録の元データは phase2-shell-services.ts と同期すること。
 */

import {
  PHASE2_SHELL_SERVICES,
  type Phase2ShellService,
} from "@/lib/services/phase2-shell-services";

export type ServicePreset = {
  id: string;
  name: string;
  shortName?: string;
  /** 検索用（かな・略称・英語名など） */
  aliases: string[];
  slug: string;
  officialUrl: string;
  /** categories.slug */
  categorySlug: string;
  catchphrase?: string;
  summary: string;
  recommendedUses?: string;
  /** lib/scraping/catalog の id。未対応なら null */
  scraperProviderId: string | null;
  /** 候補一覧での優先表示順（小さいほど上） */
  popularity: number;
};

const PRESET_ALIASES: Record<string, string[]> = {
  xserver: ["xserver", "エックス", "xサーバー", "エックスサーバ"],
  "conoha-wing": ["conoha", "コノハ", "ウィング", "conoha wing", "cono ha"],
  "shin-server": ["shin", "シンレンタル", "新レンタルサーバー", "シン・レンタル"],
  lolipop: ["lolipop", "ろりぽっぷ", "ロリポ"],
  mixhost: ["ミックスホスト", "みっくすほすと", "mix host"],
  sakura: ["sakura", "さくら", "さくらのレンタルサーバー", "さくらインターネット"],
  onamae: ["onamae", "お名前", "おなまえドットコム", "お名前サーバー"],
  colorfulbox: ["colorfulbox", "カラフル", "カラフルボックス", "かふぼ"],
  coreserver: ["coreserver", "コアサーバ", "コアサーバー", "value domain"],
  kagoya: ["カゴヤ", "かごや", "kagoya"],
  "rakko-server": ["ラッコ", "らっこ", "rakko", "ラッコサーバ"],
  heteml: ["ヘテムル", "へてむる", "heteml"],
  cpi: ["シーピーアイ", "シェアードプラン"],
  "webarena-indigo": ["webarena", "indigo", "ウェブアリーナ", "インディゴ"],
  xrea: ["xrea", "エクスリア", "エクスレア"],
  "star-server": ["starserver", "スターサーバ", "star server", "スター"],
  ablenet: ["ablenet", "エイブルネット", "あぶるねっと"],
  iclusta: ["iclusta", "アイクラスタ", "iCLUSTA"],
  zenlogic: ["zenlogic", "ゼンロジック", "idcf"],
  futoka: ["futoka", "フトカ", "ふとか"],
};

const PRESET_SHORT_NAMES: Record<string, string> = {
  xserver: "Xserver",
  "conoha-wing": "ConoHa",
  "shin-server": "シンレンタル",
  lolipop: "ロリポップ",
  mixhost: "ミックスホスト",
  sakura: "さくら",
  onamae: "お名前サーバー",
  colorfulbox: "カラフルBOX",
  coreserver: "コア",
  kagoya: "カゴヤ",
  "rakko-server": "ラッコ",
  heteml: "heteml",
  cpi: "CPI",
  "webarena-indigo": "Indigo",
  xrea: "XREA",
  "star-server": "スター",
  ablenet: "ABLENET",
  iclusta: "iCLUSTA+",
  zenlogic: "Zenlogic",
  futoka: "FUTOKA",
};

function toPreset(service: Phase2ShellService): ServicePreset {
  return {
    id: service.slug,
    name: service.name,
    shortName: PRESET_SHORT_NAMES[service.slug],
    aliases: PRESET_ALIASES[service.slug] ?? [service.slug],
    slug: service.slug,
    officialUrl: service.officialUrl,
    categorySlug: "server",
    summary: service.summary,
    scraperProviderId: service.scraperProviderId,
    popularity: service.displayOrder,
  };
}

export const SERVICE_PRESETS: readonly ServicePreset[] =
  PHASE2_SHELL_SERVICES.map(toPreset);

function normalizeQuery(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[!！]/g, "")
    .replace(/\s+/g, "")
    .replace(/ー/g, "")
    .replace(/サーバ$/g, "サーバー");
}

export function searchServicePresets(
  query: string,
  limit = 8,
): ServicePreset[] {
  const q = normalizeQuery(query);
  if (!q) {
    return [...SERVICE_PRESETS]
      .sort((a, b) => a.popularity - b.popularity)
      .slice(0, limit);
  }

  const scored = SERVICE_PRESETS.map((preset) => {
    const haystack = normalizeQuery(
      [preset.name, preset.shortName ?? "", preset.slug, ...preset.aliases].join(
        " ",
      ),
    );
    let score = 0;
    if (haystack === q) score = 100;
    else if (haystack.startsWith(q)) score = 80;
    else if (haystack.includes(q)) score = 60;
    else if (preset.aliases.some((a) => normalizeQuery(a).includes(q))) {
      score = 50;
    } else {
      return null;
    }
    score += Math.max(0, 20 - preset.popularity);
    return { preset, score };
  }).filter((x): x is { preset: ServicePreset; score: number } => Boolean(x));

  return scored
    .sort((a, b) => b.score - a.score || a.preset.popularity - b.preset.popularity)
    .slice(0, limit)
    .map((x) => x.preset);
}

export function getPopularServicePresets(limit = 6): ServicePreset[] {
  return [...SERVICE_PRESETS]
    .sort((a, b) => a.popularity - b.popularity)
    .slice(0, limit);
}

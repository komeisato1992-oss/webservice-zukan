/**
 * Playwright 非依存のプロバイダカタログ。
 * クライアント UI / Server Action の対応判定に使う。
 * 新規社追加時: ここに1件追加し、providers/ に実装を追加する。
 */
export type ScraperCatalogEntry = {
  id: string;
  label: string;
  /** services.slug との突合（複数可） */
  slugs: readonly string[];
};

export const SCRAPER_PROVIDER_CATALOG: readonly ScraperCatalogEntry[] = [
  {
    id: "xserver",
    label: "エックスサーバー",
    slugs: ["xserver"],
  },
  {
    id: "conoha-wing",
    label: "ConoHa WING",
    slugs: ["conoha-wing", "conoha"],
  },
  {
    id: "shin-server",
    label: "シンレンタルサーバー",
    slugs: ["shin-server"],
  },
  {
    id: "lolipop",
    label: "ロリポップ！",
    slugs: ["lolipop"],
  },
  {
    id: "mixhost",
    label: "mixhost",
    slugs: ["mixhost"],
  },
  {
    id: "sakura",
    label: "さくらのレンタルサーバ",
    slugs: ["sakura"],
  },
  {
    id: "colorfulbox",
    label: "ColorfulBox",
    slugs: ["colorfulbox"],
  },
  {
    id: "onamae",
    label: "お名前.com レンタルサーバー",
    slugs: ["onamae"],
  },
  {
    id: "coreserver",
    label: "CoreServer",
    slugs: ["coreserver"],
  },
  {
    id: "kagoya",
    label: "KAGOYA",
    slugs: ["kagoya"],
  },
  {
    id: "rakko-server",
    label: "ラッコサーバー",
    slugs: ["rakko-server"],
  },
  {
    id: "heteml",
    label: "heteml",
    slugs: ["heteml"],
  },
  {
    id: "cpi",
    label: "CPI",
    slugs: ["cpi"],
  },
  {
    id: "webarena-indigo",
    label: "WebARENA Indigo",
    slugs: ["webarena-indigo"],
  },
  {
    id: "xrea",
    label: "XREA",
    slugs: ["xrea"],
  },
  {
    id: "star-server",
    label: "スターサーバー",
    slugs: ["star-server"],
  },
  {
    id: "ablenet",
    label: "ABLENET",
    slugs: ["ablenet"],
  },
  {
    id: "iclusta",
    label: "iCLUSTA+",
    slugs: ["iclusta"],
  },
  {
    id: "zenlogic",
    label: "Zenlogic",
    slugs: ["zenlogic"],
  },
  {
    id: "futoka",
    label: "FUTOKA",
    slugs: ["futoka"],
  },
] as const;

export function findCatalogEntryBySlug(
  serviceSlug: string,
): ScraperCatalogEntry | null {
  return (
    SCRAPER_PROVIDER_CATALOG.find((entry) =>
      entry.slugs.includes(serviceSlug),
    ) ?? null
  );
}

export function isScrapingSupported(serviceSlug: string): boolean {
  return Boolean(findCatalogEntryBySlug(serviceSlug));
}

export function scrapingProviderLabel(serviceSlug: string): string | null {
  return findCatalogEntryBySlug(serviceSlug)?.label ?? null;
}

export function listSupportedProviderLabels(): string[] {
  return SCRAPER_PROVIDER_CATALOG.map((e) => e.label);
}

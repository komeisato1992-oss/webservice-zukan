export function collapseWhitespace(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

export function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

/** DB check: service_plans_slug_format / services_slug_format */
export const PLAN_SLUG_FORMAT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidPlanSlug(slug: string | null | undefined): boolean {
  return typeof slug === "string" && PLAN_SLUG_FORMAT.test(slug);
}

/**
 * プラン名 → 英数字ハイフン slug 基幹。
 * 日本語のみで辞書に無い場合は空文字（呼び出し側でフォールバック）。
 */
export function slugifyJaPlanName(name: string): string {
  const map: Record<string, string> = {
    エンタープライズ: "enterprise",
    ハイスピード: "high-speed",
    ビジネスプロ: "business-pro",
    ビジネススタンダード: "business-standard",
    エコノミー: "economy",
    ベーシック: "basic",
    スタンダード: "standard",
    プレミアム: "premium",
    ビジネス: "business",
    ライト: "light",
    ハイエンド: "high-end",
    マネージド: "managed",
    エントリー: "entry",
    スターター: "starter",
    プロ: "pro",
    ミニ: "mini",
    チカッパ: "chicappa",
  };
  // 長いキー優先
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const ja of keys) {
    if (name.includes(ja)) return map[ja];
  }
  const box = name.match(/BOX\s*(\d+)/i);
  if (box) return `box${box[1]}`;
  const rk = name.match(/RK\s*(\d+)/i);
  if (rk) return `rk${rk[1]}`;
  const core = name.match(/CORE-([A-Z])/i);
  if (core) return `core-${core[1].toLowerCase()}`;
  return name
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** 英数字・ハイフンのみへ正規化。不正なら空文字。 */
export function sanitizePlanSlug(raw: string | null | undefined): string {
  if (!raw) return "";
  const cleaned = String(raw)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-+/g, "-");
  return isValidPlanSlug(cleaned) ? cleaned : "";
}

export function normalizePlanName(name: string): string {
  return collapseWhitespace(name)
    .normalize("NFKC")
    .replace(/おすすめプラン/g, "")
    .trim();
}

/** Matching key: strips プラン suffix, spaces, case, common punctuation. */
export function planMatchKey(name: string | null | undefined): string {
  if (!name) return "";
  return normalizePlanName(name)
    .replace(/\s+/g, "")
    .replace(/プラン$/u, "")
    .replace(/[‐‑‒–—―ー−\-・･]/g, "")
    .toLowerCase();
}

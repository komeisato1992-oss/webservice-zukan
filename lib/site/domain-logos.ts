/**
 * ドメイン図鑑向け公式ロゴ（public/logos/domains/）。
 * slug → ローカルアセットパス。未登録は null（テキストフォールバック）。
 */

const DOMAIN_LOGO_BY_SLUG: Record<string, string> = {
  onamae: "/logos/domains/onamae.svg",
  "muumuu-domain": "/logos/domains/muumuu.svg",
  "xserver-domain": "/logos/domains/xserver-domain.svg",
  "shin-domain": "/logos/domains/shin-domain.svg",
  "sakura-domain": "/logos/domains/sakura-domain.svg",
  "star-domain": "/logos/domains/star-domain.svg",
  "value-domain": "/logos/domains/value-domain.svg",
  "cloudflare-registrar": "/logos/domains/cloudflare-registrar.svg",
};

/** 白背景に同化しやすいロゴ（枠のみ薄い地色にする） */
const DOMAIN_LOGO_SOFT_BG_SLUGS = new Set(["sakura-domain"]);

/** サービス slug からドメイン公式ロゴ URL を返す。なければ null。 */
export function resolveDomainLogoUrl(
  slug: string | null | undefined,
): string | null {
  if (!slug) return null;
  return DOMAIN_LOGO_BY_SLUG[slug] ?? null;
}

/** 白背景同化対策で枠の地色を落とすか */
export function domainLogoNeedsSoftBackground(
  slug: string | null | undefined,
): boolean {
  if (!slug) return false;
  return DOMAIN_LOGO_SOFT_BG_SLUGS.has(slug);
}

import type { AffiliateLink, Service, ServicePlan } from "@/lib/types/database";

export type OutboundLink = {
  href: string;
  /** アフィリエイトURLを使っている場合 true */
  isAffiliate: boolean;
};

/**
 * 本番「公式サイトへ」の URL 優先順位:
 * 1. services.affiliate_url（手入力）
 * 2. 互換: affiliate_links / primary_link_url
 * 3. services.official_url
 */
export function resolveOutboundLink(
  service: Pick<
    Service,
    "official_url" | "primary_link_url" | "affiliate_url"
  >,
  affiliateLinks: Pick<
    AffiliateLink,
    "affiliate_url" | "official_url" | "is_primary" | "is_active"
  >[] = [],
  _plan?: Pick<ServicePlan, "official_url"> | null,
): OutboundLink | null {
  void _plan;

  const serviceAffiliate = service.affiliate_url?.trim();
  if (serviceAffiliate) {
    return { href: serviceAffiliate, isAffiliate: true };
  }

  const primary = affiliateLinks.find(
    (link) => link.is_primary && link.is_active && link.affiliate_url,
  );
  if (primary?.affiliate_url?.trim()) {
    return { href: primary.affiliate_url.trim(), isAffiliate: true };
  }

  const primaryLink = service.primary_link_url?.trim();
  if (primaryLink) {
    return { href: primaryLink, isAffiliate: true };
  }

  const official = service.official_url?.trim();
  if (official) {
    return { href: official, isAffiliate: false };
  }

  return null;
}

export function resolveOutboundUrl(
  service: Pick<
    Service,
    "official_url" | "primary_link_url" | "affiliate_url"
  >,
  affiliateLinks: Pick<
    AffiliateLink,
    "affiliate_url" | "official_url" | "is_primary" | "is_active"
  >[] = [],
  plan?: Pick<ServicePlan, "official_url"> | null,
): string | null {
  return resolveOutboundLink(service, affiliateLinks, plan)?.href ?? null;
}

/** 外部リンク共通 rel（公式・アフィリエイト共通） */
export function outboundRel(_isAffiliate?: boolean): string {
  void _isAffiliate;
  return "noopener noreferrer sponsored";
}

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  not_applied: "未申請",
  pending: "申請中",
  approved: "承認済",
  rejected: "却下",
  closed: "終了",
};

export const SERVICE_STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  published: "公開",
  unpublished: "非公開",
};

/** カテゴリ動的ルートと衝突させない予約パス */
export const RESERVED_PATH_SEGMENTS = new Set([
  "admin",
  "articles",
  "about",
  "privacy",
  "contact",
  "disclaimer",
  "auth",
  "api",
  "login",
  "reset-password",
]);

export function isReservedPathSegment(slug: string) {
  return RESERVED_PATH_SEGMENTS.has(slug.toLowerCase());
}

export function categoryPath(categorySlug: string, ...parts: string[]) {
  return ["", categorySlug, ...parts].join("/");
}

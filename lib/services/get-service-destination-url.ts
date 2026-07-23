/**
 * 本サイトの外部サイト遷移先。
 * 優先順位: affiliate_url → official_url → null（CTA非表示）
 */
export function getServiceDestinationUrl(service: {
  affiliate_url?: string | null;
  official_url?: string | null;
}): string | null {
  return (
    service.affiliate_url?.trim() || service.official_url?.trim() || null
  );
}

export type ServiceDestinationLink = {
  href: string;
  /** affiliate_url を使っている場合 true */
  isAffiliate: boolean;
};

/** URL とアフィリエイト判定をまとめて返す */
export function getServiceDestinationLink(service: {
  affiliate_url?: string | null;
  official_url?: string | null;
}): ServiceDestinationLink | null {
  const affiliate = service.affiliate_url?.trim();
  if (affiliate) {
    return { href: affiliate, isAffiliate: true };
  }
  const official = service.official_url?.trim();
  if (official) {
    return { href: official, isAffiliate: false };
  }
  return null;
}

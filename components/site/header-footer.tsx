import { categoryPath } from "@/lib/links";
import { PRIMARY_CATEGORY_SLUG } from "@/lib/site/brand";
import { SiteHeaderClient } from "@/components/site/site-header-client";
import { SiteFooterClient } from "@/components/site/site-footer-client";

export function SiteHeader() {
  // ヘッダー内で pathname から /domain を判定するため、初期 servicesHref はサーバー用。
  // SiteHeaderClient がドメイン時に DOMAIN_NAV へ切り替える。
  const servicesHref = categoryPath(PRIMARY_CATEGORY_SLUG, "services");
  return <SiteHeaderClient servicesHref={servicesHref} />;
}

export function SiteFooter() {
  return <SiteFooterClient />;
}

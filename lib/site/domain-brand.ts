/**
 * ドメイン図鑑（公開サイト）のブランド・ナビ定義。
 * サーバー図鑑の SITE_BRAND / SITE_NAV とは分離する。
 */

export const DOMAIN_CATEGORY_SLUG = "domain";

export const DOMAIN_BRAND = "ドメイン図鑑";
export const DOMAIN_BRAND_SUB = "by Webサービス図鑑";

export const DOMAIN_DESCRIPTION =
  "ドメイン会社の取得料金・更新料金・移管料金、Whois代理公開、DNS、サポートを比較。お名前.com、ムームードメイン、XServerドメインなどから自分に合うサービスを選べます。";

export const DOMAIN_NAV = [
  { href: "/domain", label: "TOP" },
  { href: "/domain/services", label: "サービス一覧" },
  { href: "/domain/compare", label: "比較する" },
  { href: "/domain#recommended-ranking", label: "ランキング", hash: "recommended-ranking" },
  { href: "/domain#articles", label: "お役立ち記事", hash: "articles" },
] as const;

export const DOMAIN_FOOTER_GROUPS = [
  {
    title: "サイト",
    links: [
      { href: "/domain", label: "TOP" },
      { href: "/domain/services", label: "サービス一覧" },
      { href: "/domain/compare", label: "比較する" },
      { href: "/domain#recommended-ranking", label: "ランキング" },
    ],
  },
  {
    title: "サイト情報",
    links: [
      { href: "/about", label: "運営者情報" },
      { href: "/privacy", label: "プライバシーポリシー" },
      { href: "/disclaimer", label: "免責事項" },
      { href: "/contact", label: "お問い合わせ" },
    ],
  },
] as const;

/**
 * 公開サイトのブランド表示を一元管理する。
 * 将来カテゴリが増えたら SITE_BRAND / SITE_BRAND_SHORT を変更するだけでヘッダー等を戻せる。
 */
export const SITE_BRAND = "サーバー図鑑";
export const SITE_BRAND_SHORT = "サーバー図鑑";

/** 現段階の実質TOPとなるカテゴリ slug */
export const PRIMARY_CATEGORY_SLUG = "server";

export const SITE_DESCRIPTION =
  "おすすめのレンタルサーバーを料金・機能・用途別に比較できる情報サイトです。初心者、WordPress、法人利用など、目的に合ったサービスを探せます。";

export function siteTitle(pageTitle?: string): string {
  if (!pageTitle) return SITE_BRAND;
  return `${pageTitle} | ${SITE_BRAND}`;
}

export const SITE_NAV = [
  { href: "/server", label: "TOP" },
  { href: "/server/services", label: "サービス一覧" },
  { href: "/server/compare", label: "比較" },
  { href: "/server#guide", label: "選び方", hash: "guide" },
] as const;

export const SITE_FOOTER_GROUPS = [
  {
    title: "サイト",
    links: [
      { href: "/server", label: "TOP" },
      { href: "/server/services", label: "サービス一覧" },
      { href: "/server/compare", label: "比較" },
      { href: "/server#guide", label: "選び方" },
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

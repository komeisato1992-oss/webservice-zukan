import type { Metadata } from "next";
import { SITE_BRAND, SITE_DESCRIPTION } from "@/lib/site/brand";

/** 本番の正規オリジン（wwwなし）。Vercel のホストリダイレクトと一致させる。 */
export const PRODUCTION_SITE_URL = "https://webservice-zukan.jp";

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (raw && raw.length > 0) return raw;
  // 本番で env 未設定でも localhost が出力されないようにする
  if (process.env.VERCEL_ENV === "production") return PRODUCTION_SITE_URL;
  return "http://localhost:3000";
}

export function getDefaultOgImagePath(): string {
  return "/images/og-default.jpg";
}

export const PAGE_META = {
  server: {
    title: "おすすめレンタルサーバー比較｜料金・機能で選べるサーバー図鑑",
    description:
      "おすすめのレンタルサーバーを料金、容量、WordPress機能、サポートなどで比較。初心者・ブログ・法人向けなど、目的に合ったサービスを探せます。",
    path: "/server",
  },
  domain: {
    title:
      "ドメイン図鑑｜取得・更新料金を比較できるドメイン会社比較サイト",
    description:
      "ドメイン会社の取得料金・更新料金・移管料金、Whois代理公開、DNS、サポートを比較。お名前.com、ムームードメイン、XServerドメインなどから自分に合うサービスを選べます。",
    path: "/domain",
  },
  services: {
    title: "レンタルサーバー一覧",
    description:
      "掲載中のレンタルサーバーを一覧で確認できるページです。各サービスの料金・容量・特徴を比較し詳細ページへ進めます。比較表や選び方ガイドとあわせて、目的に合うサーバー選びにお役立てください。",
    path: "/server/services",
  },
  compare: {
    title: "レンタルサーバー比較",
    description:
      "気になるレンタルサーバーを複数選んで料金・容量・主要機能を並べて比較できます。候補の違いを同じ画面で確認し、契約前に公式サイトとあわせて検討するための比較ページです。",
    path: "/server/compare",
  },
  about: {
    title: "サイト情報",
    description:
      "サーバー図鑑のサイト情報です。レンタルサーバー比較サイトとして、料金・容量・機能・サポートを比較・整理しています。",
    path: "/server/about",
  },
  operator: {
    title: "運営者情報",
    description:
      "サーバー図鑑の運営者情報ページです。運営目的、情報取得方針、更新方針、お問い合わせへのご案内を掲載しています。",
    path: "/server/operator",
  },
  privacy: {
    title: "プライバシーポリシー",
    description:
      "サーバー図鑑のプライバシーポリシーです。アクセス解析やCookie、Google Analytics・Search Console、広告配信・アフィリエイト、お問い合わせで取得する情報の種類、利用目的、第三者提供、ポリシー変更について定めています。",
    path: "/server/privacy",
  },
  disclaimer: {
    title: "免責事項",
    description:
      "サーバー図鑑の免責事項です。掲載情報の正確性、料金・キャンペーン・仕様変更時は公式サイトを優先すること、損害責任および外部サイトへのリンクに関する考え方を明示しています。必ず最新情報をご確認ください。",
    path: "/server/disclaimer",
  },
  contact: {
    title: "お問い合わせ",
    description:
      "サーバー図鑑へのお問い合わせフォームです。掲載内容の修正依頼やご質問など、お名前・メールアドレス・お問い合わせ種別・内容をご記入のうえ送信できます。いただいた内容は運営への連絡にのみ利用します。",
    path: "/server/contact",
  },
} as const;

type PageMetaKey = keyof typeof PAGE_META;

export function buildPageMetadata(
  key: PageMetaKey,
  options?: { absoluteTitle?: boolean; siteName?: string },
): Metadata {
  const page = PAGE_META[key];
  const url = `${getSiteUrl()}${page.path}`;
  const brand = options?.siteName ?? SITE_BRAND;
  const title = options?.absoluteTitle
    ? { absolute: page.title }
    : page.title;

  const ogTitle = options?.absoluteTitle
    ? page.title
    : `${page.title} | ${brand}`;
  const ogImage = getDefaultOgImagePath();

  return {
    title,
    description: page.description,
    alternates: { canonical: page.path },
    openGraph: {
      title: ogTitle,
      description: page.description,
      url,
      siteName: brand,
      locale: "ja_JP",
      type: "website",
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: page.description,
      images: [ogImage],
    },
  };
}

export function buildRootMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const ogImage = getDefaultOgImagePath();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: SITE_BRAND,
      template: `%s | ${SITE_BRAND}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_BRAND,
    icons: {
      icon: [{ url: "/favicon.ico" }],
    },
    openGraph: {
      type: "website",
      locale: "ja_JP",
      siteName: SITE_BRAND,
      title: SITE_BRAND,
      description: SITE_DESCRIPTION,
      url: siteUrl,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_BRAND,
      description: SITE_DESCRIPTION,
      images: [ogImage],
    },
    verification: {
      google: "5wYXJUTIirUS2-BTe5XHLv9s6DiaimnXeZHNTME-bEo",
    },
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path?: string }>,
) {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: `${siteUrl}${item.path}` } : {}),
    })),
  };
}

/** サイト全体の Organization / WebSite 構造化データ */
export function buildSiteJsonLd() {
  const siteUrl = getSiteUrl();
  const logoUrl = `${siteUrl}/images/site-logo.png`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_BRAND,
      url: siteUrl,
      logo: logoUrl,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_BRAND,
      url: siteUrl,
      description: SITE_DESCRIPTION,
      inLanguage: "ja-JP",
      publisher: {
        "@type": "Organization",
        name: SITE_BRAND,
        url: siteUrl,
      },
    },
  ];
}

export const NOINDEX_ROBOTS = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
} as const;

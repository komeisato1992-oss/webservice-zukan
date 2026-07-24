import type { Metadata } from "next";
import {
  PRIMARY_CATEGORY_SLUG,
  SITE_BRAND,
  SITE_DESCRIPTION,
} from "@/lib/site/brand";
import {
  DOMAIN_BRAND,
  DOMAIN_CATEGORY_SLUG,
  DOMAIN_DESCRIPTION,
} from "@/lib/site/domain-brand";
import { getDefaultOgImagePath, getSiteUrl } from "@/lib/site/seo";

export const DICTIONARY_STATIC_PAGE_KINDS = [
  "about",
  "operator",
  "privacy",
  "disclaimer",
  "contact",
] as const;

export type DictionaryStaticPageKind =
  (typeof DICTIONARY_STATIC_PAGE_KINDS)[number];

export type DictionarySiteKey = "server" | "domain";

export type DictionarySiteProfile = {
  key: DictionarySiteKey;
  slug: string;
  brand: string;
  homePath: string;
  /** 1文のサイト説明 */
  siteDescription: string;
  /** サイト情報ページの紹介文（段落） */
  aboutIntro: string[];
  /** 比較対象の呼び方（本文用） */
  serviceLabel: string;
  /** 比較観点の短い列挙（本文用） */
  compareAspects: string;
  /** SEO用のサイト種別表現 */
  seoSiteType: string;
};

export const DICTIONARY_SITE_PROFILES: Record<
  DictionarySiteKey,
  DictionarySiteProfile
> = {
  server: {
    key: "server",
    slug: PRIMARY_CATEGORY_SLUG,
    brand: SITE_BRAND,
    homePath: `/${PRIMARY_CATEGORY_SLUG}`,
    siteDescription: SITE_DESCRIPTION,
    aboutIntro: [
      `${SITE_BRAND}は、レンタルサーバー各社の料金・容量・機能・サポートなどを整理し、比較しやすく提供する情報サイトです。`,
      "掲載情報は公式サイトを基に確認していますが、契約前には必ず公式サイトをご確認ください。",
    ],
    serviceLabel: "レンタルサーバー",
    compareAspects: "料金・容量・機能・サポート",
    seoSiteType: "レンタルサーバー比較サイト",
  },
  domain: {
    key: "domain",
    slug: DOMAIN_CATEGORY_SLUG,
    brand: DOMAIN_BRAND,
    homePath: `/${DOMAIN_CATEGORY_SLUG}`,
    siteDescription: "ドメイン取得サービスを比較する情報サイトです。",
    aboutIntro: [
      "ドメイン図鑑では、お名前.com、ムームードメイン、XServerドメインなど主要ドメイン取得サービスの料金・更新費用・機能・サポートを比較しています。",
      "初心者でも自分に合ったドメイン会社を選べるよう、中立的な情報提供を目指しています。",
    ],
    serviceLabel: "ドメイン取得サービス",
    compareAspects: "取得・更新・移管料金や機能・サポート",
    seoSiteType: "ドメイン取得サービス比較サイト",
  },
};

const PAGE_TITLES: Record<DictionaryStaticPageKind, string> = {
  about: "サイト情報",
  operator: "運営者情報",
  privacy: "プライバシーポリシー",
  disclaimer: "免責事項",
  contact: "お問い合わせ",
};

export function isDictionarySiteKey(value: string): value is DictionarySiteKey {
  return value === "server" || value === "domain";
}

export function getDictionarySiteProfile(
  key: DictionarySiteKey,
): DictionarySiteProfile {
  return DICTIONARY_SITE_PROFILES[key];
}

export function dictionaryStaticPagePath(
  key: DictionarySiteKey,
  kind: DictionaryStaticPageKind,
): string {
  return `/${DICTIONARY_SITE_PROFILES[key].slug}/${kind}`;
}

export function dictionaryStaticPageTitle(kind: DictionaryStaticPageKind): string {
  return PAGE_TITLES[kind];
}

function buildDescription(
  profile: DictionarySiteProfile,
  kind: DictionaryStaticPageKind,
): string {
  switch (kind) {
    case "about":
      return `${profile.brand}のサイト情報です。${profile.seoSiteType}として、${profile.serviceLabel}の${profile.compareAspects}を比較・整理しています。`;
    case "operator":
      return `${profile.brand}の運営者情報です。${profile.seoSiteType}の運営目的、情報取得方針、更新方針、お問い合わせへのご案内を掲載しています。`;
    case "privacy":
      return `${profile.brand}のプライバシーポリシーです。アクセス解析やCookie、Google Analytics・Search Console、広告配信・アフィリエイト、お問い合わせで取得する情報の取り扱いについて定めています。`;
    case "disclaimer":
      return `${profile.brand}の免責事項です。掲載情報の正確性、料金・キャンペーン・仕様変更時は公式サイトを優先すること、損害責任および外部リンクに関する考え方を明示しています。`;
    case "contact":
      return `${profile.brand}へのお問い合わせフォームです。掲載内容の修正依頼やご質問など、お名前・メールアドレス・お問い合わせ種別・内容をご記入のうえ送信できます。`;
  }
}

export function buildDictionaryStaticPageMetadata(
  key: DictionarySiteKey,
  kind: DictionaryStaticPageKind,
): Metadata {
  const profile = getDictionarySiteProfile(key);
  const titleText = dictionaryStaticPageTitle(kind);
  const fullTitle = `${titleText} | ${profile.brand}`;
  const description = buildDescription(profile, kind);
  const path = dictionaryStaticPagePath(key, kind);
  const url = `${getSiteUrl()}${path}`;
  const ogImage = getDefaultOgImagePath();

  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: profile.brand,
      locale: "ja_JP",
      type: "website",
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
    },
  };
}

export function listDictionaryStaticSitemapPaths(): string[] {
  const kinds = DICTIONARY_STATIC_PAGE_KINDS;
  const keys: DictionarySiteKey[] = ["server", "domain"];
  return keys.flatMap((key) =>
    kinds.map((kind) => dictionaryStaticPagePath(key, kind)),
  );
}

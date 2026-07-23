import type { GuideArticleMeta } from "@/lib/guides/types";
import { BusinessRentalServerArticle } from "@/components/site/guides/business-rental-server-article";
import { FastRentalServerArticle } from "@/components/site/guides/fast-rental-server-article";
import { CheapRentalServerArticle } from "@/components/site/guides/cheap-rental-server-article";
import { RentalServerRecommendationArticle } from "@/components/site/guides/rental-server-recommendation-article";
import { WordpressRentalServerArticle } from "@/components/site/guides/wordpress-rental-server-article";
import { WordpressVsServerArticle } from "@/components/site/guides/wordpress-vs-server-article";
import { PRIMARY_CATEGORY_SLUG } from "@/lib/site/brand";
import { categoryPath } from "@/lib/links";

const RENTAL_SERVER_RECOMMENDATION: GuideArticleMeta = {
  slug: "rental-server-recommendation",
  title:
    "【2026年版】レンタルサーバーおすすめ10選｜初心者でも失敗しない選び方を徹底比較",
  description:
    "レンタルサーバー選びで迷っていませんか？初心者・WordPress・ブログ・法人向けなど用途別におすすめのレンタルサーバーを徹底比較。料金・速度・サポートまで分かりやすく解説します。",
  categories: ["おすすめ", "比較", "初心者"],
  publishedAt: "2026-07-23",
  updatedAt: "2026-07-23",
  toc: [
    { id: "intro", label: "レンタルサーバー選びで迷っていませんか？" },
    { id: "what-you-learn", label: "この記事で分かること" },
    { id: "conclusion-top3", label: "結論｜迷ったらこの3社がおすすめ" },
    {
      id: "selection-points",
      label: "レンタルサーバー選びで失敗しない7つのポイント",
    },
    { id: "top10", label: "おすすめレンタルサーバー10選" },
    { id: "by-purpose", label: "用途別おすすめレンタルサーバー" },
    { id: "faq", label: "よくある質問" },
    { id: "summary", label: "まとめ" },
  ],
  related: [
    {
      href: "/guides/wordpress-vs-rental-server",
      label: "レンタルサーバーとWordPressの違い",
    },
    {
      href: "/guides/fast-rental-server",
      label: "表示速度が速いレンタルサーバーおすすめ3選",
    },
    {
      href: "/guides/business-rental-server",
      label: "法人向けレンタルサーバーおすすめ3選",
    },
    {
      href: "/guides/cheap-rental-server",
      label: "月額料金が安いレンタルサーバーおすすめ",
    },
    {
      href: "/guides/wordpress-rental-server",
      label: "WordPressにおすすめのレンタルサーバー3選",
    },
    {
      href: categoryPath(PRIMARY_CATEGORY_SLUG, "compare"),
      label: "レンタルサーバー比較",
    },
    {
      href: categoryPath(PRIMARY_CATEGORY_SLUG, "services", "xserver"),
      label: "エックスサーバーとは",
    },
  ],
  Content: RentalServerRecommendationArticle,
};

const WORDPRESS_RENTAL_SERVER: GuideArticleMeta = {
  slug: "wordpress-rental-server",
  title:
    "WordPressにおすすめのレンタルサーバー3選【2026年版】初心者向けに比較",
  description:
    "WordPressにおすすめのレンタルサーバーを初心者向けに徹底比較。エックスサーバー・ConoHa WING・シンレンタルサーバーなど、料金・速度・サポートで選ぶポイントを解説します。",
  categories: ["WordPress", "おすすめ", "初心者"],
  publishedAt: "2026-07-24",
  updatedAt: "2026-07-24",
  toc: [
    {
      id: "intro",
      label: "WordPressを始めるならレンタルサーバー選びが重要",
    },
    {
      id: "selection-points",
      label: "WordPress向けレンタルサーバーを選ぶポイント",
    },
    { id: "top3", label: "WordPressにおすすめのレンタルサーバー3選" },
    { id: "rank-4-to-10", label: "4位以降のおすすめレンタルサーバー" },
    { id: "for-beginners", label: "初心者におすすめなのは？" },
    { id: "faq", label: "よくある質問" },
    { id: "summary", label: "まとめ" },
  ],
  related: [
    {
      href: "/guides/wordpress-vs-rental-server",
      label: "レンタルサーバーとWordPressの違い",
    },
    {
      href: "/guides/fast-rental-server",
      label: "表示速度が速いレンタルサーバーおすすめ3選",
    },
    {
      href: "/guides/business-rental-server",
      label: "法人向けレンタルサーバーおすすめ3選",
    },
    {
      href: "/guides/cheap-rental-server",
      label: "月額料金が安いレンタルサーバーおすすめ",
    },
    {
      href: "/guides/rental-server-recommendation",
      label: "レンタルサーバーおすすめ10選",
    },
    {
      href: `/${PRIMARY_CATEGORY_SLUG}#purpose-wordpress`,
      label: "WordPress向けランキング",
    },
    {
      href: categoryPath(PRIMARY_CATEGORY_SLUG, "compare"),
      label: "レンタルサーバー比較",
    },
    {
      href: categoryPath(PRIMARY_CATEGORY_SLUG, "services", "xserver"),
      label: "エックスサーバーとは",
    },
  ],
  Content: WordpressRentalServerArticle,
};

const CHEAP_RENTAL_SERVER: GuideArticleMeta = {
  slug: "cheap-rental-server",
  title:
    "月額料金が安いレンタルサーバーおすすめ【2026年版】格安でも失敗しない選び方",
  description:
    "月額料金が安いレンタルサーバーを格安でも失敗しない選び方で紹介。ロリポップ！・スターサーバー・XREAなど、初期費用やWordPress対応も比較して解説します。",
  categories: ["格安", "おすすめ", "初心者"],
  publishedAt: "2026-07-24",
  updatedAt: "2026-07-24",
  toc: [
    { id: "intro", label: "安いレンタルサーバーを探していませんか？" },
    { id: "selection-points", label: "格安レンタルサーバーを選ぶポイント" },
    { id: "top3", label: "月額料金が安いおすすめレンタルサーバー3選" },
    { id: "rank-4-to-10", label: "4位以降のおすすめ" },
    { id: "who-for", label: "格安サーバーはどんな人におすすめ？" },
    { id: "faq", label: "よくある質問" },
    { id: "summary", label: "まとめ" },
  ],
  related: [
    {
      href: "/guides/wordpress-vs-rental-server",
      label: "レンタルサーバーとWordPressの違い",
    },
    {
      href: "/guides/fast-rental-server",
      label: "表示速度が速いレンタルサーバーおすすめ3選",
    },
    {
      href: "/guides/business-rental-server",
      label: "法人向けレンタルサーバーおすすめ3選",
    },
    {
      href: "/guides/rental-server-recommendation",
      label: "レンタルサーバーおすすめ10選",
    },
    {
      href: "/guides/wordpress-rental-server",
      label: "WordPressにおすすめのレンタルサーバー3選",
    },
    {
      href: `/${PRIMARY_CATEGORY_SLUG}#purpose-cheap`,
      label: "月額料金が安いランキング",
    },
    {
      href: categoryPath(PRIMARY_CATEGORY_SLUG, "compare"),
      label: "レンタルサーバー比較",
    },
    {
      href: categoryPath(PRIMARY_CATEGORY_SLUG, "services", "lolipop"),
      label: "ロリポップ！とは",
    },
  ],
  Content: CheapRentalServerArticle,
};

const BUSINESS_RENTAL_SERVER: GuideArticleMeta = {
  slug: "business-rental-server",
  title:
    "法人向けレンタルサーバーおすすめ3選【2026年版】企業サイトに適したサービスを比較",
  description:
    "法人向けレンタルサーバーおすすめを比較。エックスサーバー・CPI・KAGOYAなど、安定性・セキュリティ・サポートで企業サイトに適したサービスを解説します。",
  categories: ["法人", "おすすめ", "比較"],
  publishedAt: "2026-07-24",
  updatedAt: "2026-07-24",
  toc: [
    { id: "intro", label: "法人サイトではレンタルサーバー選びが重要" },
    {
      id: "selection-points",
      label: "法人向けレンタルサーバーを選ぶポイント",
    },
    { id: "top3", label: "法人向けおすすめレンタルサーバー3選" },
    { id: "rank-4-to-5", label: "4位以降の法人向けサーバー" },
    { id: "faq", label: "法人利用でよくある質問" },
    { id: "summary", label: "まとめ" },
  ],
  related: [
    {
      href: "/guides/wordpress-vs-rental-server",
      label: "レンタルサーバーとWordPressの違い",
    },
    {
      href: "/guides/rental-server-recommendation",
      label: "レンタルサーバーおすすめ10選",
    },
    {
      href: "/guides/wordpress-rental-server",
      label: "WordPressにおすすめのレンタルサーバー3選",
    },
    {
      href: `/${PRIMARY_CATEGORY_SLUG}#purpose-business`,
      label: "法人向けランキング",
    },
    {
      href: categoryPath(PRIMARY_CATEGORY_SLUG, "compare"),
      label: "レンタルサーバー比較",
    },
    {
      href: categoryPath(PRIMARY_CATEGORY_SLUG, "services", "xserver"),
      label: "エックスサーバーとは",
    },
    {
      href: categoryPath(PRIMARY_CATEGORY_SLUG, "services", "cpi"),
      label: "CPIとは",
    },
  ],
  Content: BusinessRentalServerArticle,
};


const FAST_RENTAL_SERVER: GuideArticleMeta = {
  slug: "fast-rental-server",
  title:
    "表示速度が速いレンタルサーバーおすすめ3選【2026年版】高速サーバーの選び方を解説",
  description:
    "表示速度が速いレンタルサーバーおすすめを比較。ConoHa WING・エックスサーバー・mixhostなど、NVMeやWordPress向け機能を踏まえた高速サーバーの選び方を解説します。",
  categories: ["高速", "おすすめ", "比較"],
  publishedAt: "2026-07-24",
  updatedAt: "2026-07-24",
  toc: [
    {
      id: "intro",
      label: "表示速度を重視してレンタルサーバーを選びたい方へ",
    },
    {
      id: "selection-points",
      label: "高速なレンタルサーバーを選ぶポイント",
    },
    {
      id: "top3",
      label: "表示速度を重視する方におすすめのレンタルサーバー3選",
    },
    { id: "rank-4-to-10", label: "4位以降のおすすめ" },
    { id: "faq", label: "よくある質問" },
    { id: "summary", label: "まとめ" },
  ],
  related: [
    {
      href: "/guides/wordpress-vs-rental-server",
      label: "レンタルサーバーとWordPressの違い",
    },
    {
      href: "/guides/rental-server-recommendation",
      label: "レンタルサーバーおすすめ10選",
    },
    {
      href: "/guides/wordpress-rental-server",
      label: "WordPressにおすすめのレンタルサーバー3選",
    },
    {
      href: `/${PRIMARY_CATEGORY_SLUG}#purpose-speed`,
      label: "表示速度が速いランキング",
    },
    {
      href: categoryPath(PRIMARY_CATEGORY_SLUG, "compare"),
      label: "レンタルサーバー比較",
    },
    {
      href: categoryPath(PRIMARY_CATEGORY_SLUG, "services", "conoha-wing"),
      label: "ConoHa WINGとは",
    },
    {
      href: categoryPath(PRIMARY_CATEGORY_SLUG, "services", "xserver"),
      label: "エックスサーバーとは",
    },
  ],
  Content: FastRentalServerArticle,
};


const WORDPRESS_VS_SERVER: GuideArticleMeta = {
  slug: "wordpress-vs-rental-server",
  title: "レンタルサーバーとWordPressの違いとは？初心者向けにわかりやすく解説",
  description:
    "WordPressとレンタルサーバーの違いを初心者向けに解説。役割の違い、ドメインとの関係、ブログ公開までの流れ、おすすめサーバーまでわかりやすく紹介します。",
  categories: ["初心者", "WordPress", "おすすめ"],
  publishedAt: "2026-07-24",
  updatedAt: "2026-07-24",
  toc: [
    {
      id: "intro",
      label: "「WordPress」と「レンタルサーバー」は何が違う？",
    },
    { id: "what-is-wordpress", label: "WordPressとは？" },
    { id: "what-is-server", label: "レンタルサーバーとは？" },
    { id: "difference", label: "WordPressとレンタルサーバーの違い" },
    { id: "domain", label: "ドメインも必要？" },
    { id: "flow", label: "ブログ公開までの流れ" },
    { id: "recommended", label: "初心者におすすめのレンタルサーバー3選" },
    { id: "faq", label: "よくある質問" },
    { id: "summary", label: "まとめ" },
  ],
  related: [
    {
      href: "/guides/wordpress-rental-server",
      label: "WordPressにおすすめのレンタルサーバー3選",
    },
    {
      href: "/guides/rental-server-recommendation",
      label: "レンタルサーバーおすすめ10選",
    },
    {
      href: `/${PRIMARY_CATEGORY_SLUG}#purpose-beginner`,
      label: "初心者向けランキング",
    },
    {
      href: categoryPath(PRIMARY_CATEGORY_SLUG, "compare"),
      label: "レンタルサーバー比較",
    },
    {
      href: categoryPath(PRIMARY_CATEGORY_SLUG, "services", "xserver"),
      label: "エックスサーバーとは",
    },
  ],
  Content: WordpressVsServerArticle,
};

const GUIDES: GuideArticleMeta[] = [
  WORDPRESS_VS_SERVER,
  FAST_RENTAL_SERVER,
  BUSINESS_RENTAL_SERVER,
  CHEAP_RENTAL_SERVER,
  WORDPRESS_RENTAL_SERVER,
  RENTAL_SERVER_RECOMMENDATION,
];

export function listGuides(): GuideArticleMeta[] {
  return GUIDES;
}

export function getGuideBySlug(slug: string): GuideArticleMeta | null {
  return GUIDES.find((g) => g.slug === slug) ?? null;
}

export function getAllGuideSlugs(): string[] {
  return GUIDES.map((g) => g.slug);
}

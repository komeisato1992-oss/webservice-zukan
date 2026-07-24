import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DOMAIN_CATEGORY_SLUG, DOMAIN_BRAND } from "@/lib/site/domain-brand";
import {
  getDomainBeginnerArticle,
  listDomainBeginnerArticleSlugs,
} from "@/lib/domain-articles/registry";
import { loadDomainBeginnerArticle } from "@/lib/domain-articles/public";
import { DomainArticleShell } from "@/components/site/domain-article-shell";
import { getSiteUrl } from "@/lib/site/seo";

export const revalidate = 300;

type Props = { params: Promise<{ categorySlug: string; slug: string }> };

export function generateStaticParams() {
  return listDomainBeginnerArticleSlugs().map((slug) => ({
    categorySlug: DOMAIN_CATEGORY_SLUG,
    slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug, slug } = await params;
  if (categorySlug !== DOMAIN_CATEGORY_SLUG) {
    return { title: "記事" };
  }
  const article = await loadDomainBeginnerArticle(slug);
  if (!article) return { title: "記事" };

  const path = `/${DOMAIN_CATEGORY_SLUG}/articles/${article.slug}`;
  const url = `${getSiteUrl()}${path}`;

  return {
    title: { absolute: article.title },
    description: article.description,
    alternates: { canonical: path },
    openGraph: {
      title: article.title,
      description: article.description,
      url,
      siteName: DOMAIN_BRAND,
      locale: "ja_JP",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
    },
  };
}

export default async function DomainArticlePage({ params }: Props) {
  const { categorySlug, slug } = await params;
  if (categorySlug !== DOMAIN_CATEGORY_SLUG) notFound();
  if (!getDomainBeginnerArticle(slug)) notFound();

  const article = await loadDomainBeginnerArticle(slug);
  if (!article) notFound();

  return <DomainArticleShell article={article} />;
}

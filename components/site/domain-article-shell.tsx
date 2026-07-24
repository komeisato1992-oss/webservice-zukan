import Link from "next/link";
import { DOMAIN_CATEGORY_SLUG, DOMAIN_BRAND } from "@/lib/site/domain-brand";
import { getSiteUrl } from "@/lib/site/seo";
import { Breadcrumb } from "@/components/site/ui";
import type { PublishedDomainArticle } from "@/lib/domain-articles/public";

type Props = {
  article: PublishedDomainArticle;
  children?: React.ReactNode;
};

export function DomainArticleShell({ article }: Props) {
  const path = `/${DOMAIN_CATEGORY_SLUG}/articles/${article.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt ?? undefined,
    dateModified: article.updatedAt ?? article.publishedAt ?? undefined,
    mainEntityOfPage: `${getSiteUrl()}${path}`,
    inLanguage: "ja-JP",
    publisher: {
      "@type": "Organization",
      name: DOMAIN_BRAND,
    },
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb
        items={[
          { href: `/${DOMAIN_CATEGORY_SLUG}`, label: "トップ" },
          { href: `/${DOMAIN_CATEGORY_SLUG}#beginner`, label: "初めての方へ" },
          { label: article.title },
        ]}
      />

      <h1 className="mt-3 text-[1.5rem] font-bold leading-snug tracking-tight text-[var(--text-primary)] sm:text-[1.875rem]">
        {article.title}
      </h1>

      <p className="mt-3 text-[14px] leading-relaxed text-[var(--text-body)] sm:text-[15px]">
        {article.description}
      </p>

      {article.toc.length > 0 ? (
        <nav
          aria-label="目次"
          className="mt-6 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 sm:px-5"
        >
          <p className="text-[12px] font-semibold tracking-wide text-[var(--text-muted)]">
            目次
          </p>
          <ol className="mt-2 space-y-1.5">
            {article.toc.map((item, index) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="text-[13px] text-[var(--text-body)] hover:text-[var(--accent)] sm:text-[14px]"
                >
                  <span className="mr-1.5 tabular-nums text-[var(--text-muted)]">
                    {index + 1}.
                  </span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div
        className="domain-article-prose mt-8 space-y-6 text-[14px] leading-relaxed text-[var(--text-body)] sm:mt-10 sm:space-y-8 sm:text-[15px]"
        dangerouslySetInnerHTML={{ __html: article.html }}
      />

      <div className="mt-10 border-t border-[var(--border)] pt-6">
        <Link
          href={`/${DOMAIN_CATEGORY_SLUG}#beginner`}
          className="text-[14px] font-medium text-[var(--accent)] underline-offset-2 hover:underline"
        >
          ← ドメイン選びが初めての方へに戻る
        </Link>
      </div>
    </article>
  );
}

import Link from "next/link";
import type { GuideArticleMeta } from "@/lib/guides/types";
import { PRIMARY_CATEGORY_SLUG } from "@/lib/site/brand";
import { getSiteUrl } from "@/lib/site/seo";
import { SiteBadge } from "@/components/site/site-badge";
import { Breadcrumb } from "@/components/site/ui";

type Props = {
  guide: GuideArticleMeta;
  children: React.ReactNode;
};

export function GuideShell({ guide, children }: Props) {
  const path = `/guides/${guide.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    mainEntityOfPage: `${getSiteUrl()}${path}`,
    inLanguage: "ja-JP",
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb
        items={[
          { href: `/${PRIMARY_CATEGORY_SLUG}`, label: "トップ" },
          { href: "/guides", label: "ガイド" },
          { label: guide.title },
        ]}
      />

      <div className="mt-3 flex flex-wrap gap-1.5">
        {guide.categories.map((cat) => (
          <SiteBadge key={cat} variant="featured">
            {cat}
          </SiteBadge>
        ))}
      </div>

      <h1 className="mt-3 text-[1.5rem] font-bold leading-snug tracking-tight text-[var(--text-primary)] sm:text-[1.875rem]">
        {guide.title}
      </h1>

      <p className="mt-3 text-[14px] leading-relaxed text-[var(--text-body)] sm:text-[15px]">
        {guide.description}
      </p>

      <nav
        aria-label="目次"
        className="mt-6 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 sm:px-5"
      >
        <p className="text-[12px] font-semibold tracking-wide text-[var(--text-muted)]">
          目次
        </p>
        <ol className="mt-2 space-y-1.5">
          {guide.toc.map((item, index) => (
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

      <div className="guide-prose mt-8 space-y-8 text-[14px] leading-relaxed text-[var(--text-body)] sm:text-[15px]">
        {children}
      </div>

      {guide.related.length > 0 ? (
        <section className="mt-10 border-t border-[var(--border)] pt-8">
          <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-[1.0625rem]">
            関連記事・ページ
          </h2>
          <ul className="mt-3 space-y-2">
            {guide.related.map((item) => (
              <li key={`${item.href}-${item.label}`}>
                <Link
                  href={item.href}
                  className="text-[14px] font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

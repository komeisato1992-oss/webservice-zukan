import Link from "next/link";
import type { PublicContentCard } from "@/lib/contents/types";
import {
  DOMAIN_BEGINNER_LINKS,
  DOMAIN_FAQS,
  DOMAIN_PAGE_SECTION_NAV,
} from "@/lib/site/content";
import {
  DOMAIN_BRAND,
  DOMAIN_BRAND_SUB,
  DOMAIN_DESCRIPTION,
} from "@/lib/site/domain-brand";
import type { DomainTopData } from "@/lib/site/domain-public-data";
import type { ManagedRankingSet } from "@/lib/site/rankings-public";
import { getSiteUrl } from "@/lib/site/seo";
import { categoryPath } from "@/lib/links";
import { DomainCompareGroupCards } from "@/components/site/domain-compare-group-cards";
import { DomainTopCompareTable } from "@/components/site/domain-top-compare-table";
import { DomainRecommendedRanking } from "@/components/site/domain-recommended-ranking";
import { DomainServiceCard } from "@/components/site/domain-service-card";
import { FaqAccordion } from "@/components/site/faq-accordion";
import {
  SectionHeader,
  SectionShell,
  SiteLinkButton,
  buttonClass,
  cn,
} from "@/components/site/ui";

type Props = {
  data: DomainTopData;
  latestContents?: PublicContentCard[];
  managedRankings?: Record<string, ManagedRankingSet>;
};

export function DomainTopPage({
  data,
  latestContents = [],
  managedRankings = {},
}: Props) {
  const { category, services, allCount, comparisonItems, detailsByServiceId } =
    data;
  const categorySlug = category.slug;
  const jsonLd = buildDomainJsonLd({
    faqs: DOMAIN_FAQS,
    categorySlug,
    serviceCount: allCount,
  });

  const sectionNav = DOMAIN_PAGE_SECTION_NAV.filter(
    (item) => item.href !== "#articles" || latestContents.length > 0,
  );

  const beginnerLinks = DOMAIN_BEGINNER_LINKS.filter((l) => l.href);

  return (
    <div className="bg-white">
      <link
        rel="preload"
        as="image"
        href="/images/domain/domain-hero.jpeg"
        type="image/jpeg"
        fetchPriority="high"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="hero-domain text-white">
        <div className="hero-domain-photo" aria-hidden />
        <div className="hero-domain-content relative mx-auto flex min-h-[inherit] max-w-[90rem] items-center px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
          <div className="hero-copy-local min-w-0 max-w-xl lg:pr-4">
            <p className="inline-flex max-w-full items-center rounded-full bg-white/20 px-3.5 py-1.5 text-[12px] font-semibold leading-none tracking-tight text-white backdrop-blur-[2px] sm:px-4 sm:text-[13px]">
              <span className="jp-keep">ドメイン会社をわかりやすく比較</span>
            </p>
            <h1 className="hero-title-shadow mt-3 text-[2rem] font-extrabold leading-[1.2] tracking-tight text-white sm:mt-3.5 sm:text-[2.5rem] sm:leading-[1.18] lg:text-[3rem]">
              {DOMAIN_BRAND}
            </h1>
            <p className="mt-1 text-[12px] font-medium text-white/80 sm:text-[13px]">
              {DOMAIN_BRAND_SUB}
            </p>
            <p className="hero-desc-shadow mt-2.5 max-w-md text-[13px] leading-[1.7] text-white/92 text-pretty sm:mt-3 sm:text-[14px]">
              取得・更新・移管料金や機能、サポートを比較。
              <br className="hidden sm:block" />
              あなたに合うドメインサービスが見つかります。
            </p>
            <div className="mt-5 flex flex-col gap-2.5 sm:mt-6 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-3">
              <Link
                href={categoryPath(categorySlug, "compare")}
                className={cn(
                  buttonClass("primary", "md"),
                  "h-11 min-h-11 w-full justify-center border border-white/20 bg-[#067571] px-4 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)] hover:bg-[#056663] sm:w-auto sm:min-w-[11rem]",
                )}
              >
                <span className="jp-keep">サービスを比較する</span>
              </Link>
              <a
                href="#recommended-ranking"
                className={cn(
                  buttonClass("secondary", "md"),
                  "h-11 min-h-11 w-full justify-center border-0 bg-white px-4 text-[13px] font-semibold text-[#067571] hover:bg-white/92 sm:w-auto sm:min-w-[11rem]",
                )}
              >
                <span className="jp-keep">おすすめランキングを見る</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <nav
        aria-label="ページ内"
        className="sticky top-[var(--header-height-compact)] z-30 border-b border-[var(--border)] bg-white/95 backdrop-blur"
      >
        <div className="mx-auto max-w-[var(--container-max)] px-4 sm:px-6">
          <ul className="scroll-row flex justify-start gap-1.5 overflow-x-auto py-2 sm:flex-wrap sm:justify-center sm:overflow-visible">
            {sectionNav.map((item) => (
              <li key={item.href} className="shrink-0">
                <a
                  href={item.href}
                  className="inline-flex h-7 items-center rounded-full border border-[var(--border)] bg-white px-3 text-[12px] font-medium text-[var(--navy)] transition duration-150 hover:border-[var(--navy)]/30 hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <DomainRecommendedRanking
        categorySlug={categorySlug}
        managedRankings={managedRankings}
      />

      <DomainCompareGroupCards />

      <DomainTopCompareTable
        categorySlug={categorySlug}
        services={services}
        comparisonItems={comparisonItems ?? []}
        detailsByServiceId={detailsByServiceId ?? {}}
        managedRankings={managedRankings}
      />

      <SectionShell
        id="all-services"
        tone="white"
        className="!py-[calc(var(--section-py)*0.4)] sm:!py-[calc(var(--section-py-md)*0.4)]"
      >
        <SectionHeader
          title="サービス一覧"
          description="管理画面で公開中のドメインサービスです。"
          emphasis
        />
        {services.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--text-body)]">
            公開中のサービスはまだありません。管理画面でサービスを公開するとここに表示されます。
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
            {services.map((item) => (
              <li key={item.service.id}>
                <DomainServiceCard item={item} categorySlug={categorySlug} />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 text-center sm:mt-5">
          <SiteLinkButton
            href={categoryPath(categorySlug, "services")}
            variant="secondary"
            size="md"
          >
            サービス一覧を見る
            {allCount > 0 ? `（${allCount}社）` : ""}
          </SiteLinkButton>
        </div>
      </SectionShell>

      {latestContents.length > 0 ? (
        <SectionShell id="articles" tone="gray">
          <SectionHeader
            title="お役立ち記事"
            description="ドメイン選びに役立つ情報をまとめています。"
          />
          <ul className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
            {latestContents.map((item) => {
              const updated = formatDate(item.updatedAt) ?? formatDate(item.publishedAt);
              const readHref =
                item.sourceUrl ||
                (item.serviceSlug
                  ? categoryPath(categorySlug, "services", item.serviceSlug)
                  : null);
              return (
                <li
                  key={item.id}
                  className="flex h-full flex-col rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-3.5 shadow-[var(--shadow-card)] sm:p-4"
                >
                  <p className="text-[11px] font-medium text-[var(--navy)]">
                    {item.contentTypeLabel}
                  </p>
                  <h3 className="mt-1.5 text-[14px] font-bold leading-snug text-[var(--text-primary)] sm:text-[15px]">
                    {item.title}
                  </h3>
                  {item.summary ? (
                    <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-[var(--text-body)]">
                      {item.summary}
                    </p>
                  ) : null}
                  {updated ? (
                    <p className="mt-2 text-[11px] tabular-nums text-[var(--text-muted)]">
                      更新日 {updated}
                    </p>
                  ) : null}
                  {readHref ? (
                    <div className="mt-auto pt-3">
                      <a
                        href={readHref}
                        className={cn(
                          buttonClass("secondary", "sm"),
                          "min-h-11 w-full",
                        )}
                        {...(item.sourceUrl
                          ? {
                              target: "_blank",
                              rel: "noopener noreferrer",
                            }
                          : {})}
                      >
                        記事を読む
                      </a>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </SectionShell>
      ) : null}

      <SectionShell
        id="beginner"
        tone={latestContents.length > 0 ? "white" : "gray"}
        className="!py-[calc(var(--section-py)*0.4)] sm:!py-[calc(var(--section-py-md)*0.35)]"
      >
        <SectionHeader
          title="ドメイン選びが初めての方へ"
          description="基礎知識をこれから記事で順次公開予定です。"
          className="!mb-0"
        />
        {beginnerLinks.length > 0 ? (
          <ul className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-2">
            {beginnerLinks.map((link) => (
              <li key={link.articleSlug}>
                <Link
                  href={link.href!}
                  className="flex min-h-11 items-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-3.5 text-[13px] font-medium text-[var(--navy)] transition hover:border-[var(--navy)]/30 hover:bg-[var(--surface)]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-2">
            {DOMAIN_BEGINNER_LINKS.map((link) => (
              <li key={link.articleSlug}>
                <span
                  className="flex min-h-11 items-center rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-3.5 text-[13px] text-[var(--text-muted)]"
                  data-article-slug={link.articleSlug}
                >
                  {link.label}
                  <span className="ml-auto text-[11px]">準備中</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionShell>

      <SectionShell
        id="faq"
        tone="gray"
        className="!pb-[calc(var(--section-py)+4.5rem)] sm:!pb-[calc(var(--section-py-md)+3rem)]"
      >
        <div className="relative z-30 mx-auto max-w-3xl">
          <SectionHeader
            title="よくある質問"
            description="ドメイン選びに関するよくある疑問をまとめました。"
          />
          <div className="mt-4 sm:mt-5">
            <FaqAccordion items={DOMAIN_FAQS} />
          </div>
        </div>
      </SectionShell>
    </div>
  );
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function buildDomainJsonLd({
  faqs,
  categorySlug,
  serviceCount,
}: {
  faqs: typeof DOMAIN_FAQS;
  categorySlug: string;
  serviceCount: number;
}) {
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/${categorySlug}`;
  const countLabel =
    serviceCount > 0 ? `${serviceCount}社` : "主要サービス";

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: DOMAIN_BRAND,
      url: pageUrl,
      description: DOMAIN_DESCRIPTION,
      inLanguage: "ja-JP",
      publisher: {
        "@type": "Organization",
        name: DOMAIN_BRAND,
        url: pageUrl,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: DOMAIN_BRAND,
      description: `${countLabel}のドメインサービスを取得・更新・移管料金や機能・サポートで比較できます。`,
      url: pageUrl,
      isPartOf: {
        "@type": "WebSite",
        name: DOMAIN_BRAND,
        url: pageUrl,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ];
}

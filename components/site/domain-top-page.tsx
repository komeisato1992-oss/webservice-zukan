import Link from "next/link";
import Image from "next/image";
import {
  DOMAIN_BEGINNER_LINKS,
  DOMAIN_FAQS,
  DOMAIN_PAGE_SECTION_NAV,
} from "@/lib/site/content";
import {
  DOMAIN_BRAND,
  DOMAIN_DESCRIPTION,
  DOMAIN_LOGO_HEIGHT,
  DOMAIN_LOGO_SRC,
  DOMAIN_LOGO_WIDTH,
} from "@/lib/site/domain-brand";
import type { DomainTopData } from "@/lib/site/domain-public-data";
import type { ManagedRankingSet } from "@/lib/site/rankings-public";
import { getSiteUrl } from "@/lib/site/seo";
import { categoryPath } from "@/lib/links";
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
  managedRankings?: Record<string, ManagedRankingSet>;
};

export function DomainTopPage({ data, managedRankings = {} }: Props) {
  const { category, services, allCount, comparisonItems, detailsByServiceId } =
    data;
  const categorySlug = category.slug;
  const jsonLd = buildDomainJsonLd({
    faqs: DOMAIN_FAQS,
    categorySlug,
    serviceCount: allCount,
  });

  const beginnerLinks = DOMAIN_BEGINNER_LINKS;

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
        <div className="hero-domain-content relative mx-auto flex min-h-[inherit] max-w-[90rem] items-center px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-7">
          <div className="hero-copy-local min-w-0 max-w-xl lg:pr-4">
            <Image
              src={DOMAIN_LOGO_SRC}
              alt={DOMAIN_BRAND}
              width={DOMAIN_LOGO_WIDTH}
              height={DOMAIN_LOGO_HEIGHT}
              priority
              sizes="(max-width: 640px) 220px, (max-width: 1024px) 280px, 320px"
              className="h-auto w-[13.75rem] max-w-full object-contain object-left sm:w-[16.5rem] lg:w-[18rem]"
            />
            <h1 className="hero-title-shadow mt-2.5 text-[1.625rem] font-extrabold leading-[1.25] tracking-tight text-white sm:mt-3 sm:text-[2.125rem] sm:leading-[1.22] lg:text-[2.5rem]">
              <span className="jp-keep">主要ドメインサービスをまとめて比較</span>
            </h1>
            <p className="hero-desc-shadow mt-2 max-w-md text-[13px] leading-[1.65] text-white/92 text-pretty sm:text-[14px]">
              取得・更新・移管料金や機能、サポートを一覧で比較。
              <br className="hidden sm:block" />
              あなたに合うドメインサービスを見つけられます。
            </p>
            <div className="mt-4 flex flex-col gap-2.5 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-3">
              <a
                href="#domain-compare-table"
                className={cn(
                  buttonClass("primary", "md"),
                  "h-11 min-h-11 w-full justify-center border border-white/20 bg-[#067571] px-4 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)] hover:bg-[#056663] sm:w-auto sm:min-w-[11rem]",
                )}
              >
                <span className="jp-keep">サービスを比較する</span>
              </a>
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
            {DOMAIN_PAGE_SECTION_NAV.map((item) => (
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
        className="!py-0"
        innerClassName="!py-5 sm:!py-6"
      >
        <SectionHeader
          title="サービス一覧"
          description="比較したあと、気になるサービスの詳細を確認できます。"
          emphasis
          className="!mb-0"
        />
        {services.length === 0 ? (
          <p className="mt-3 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center text-sm text-[var(--text-body)]">
            公開中のサービスはまだありません。管理画面でサービスを公開するとここに表示されます。
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-3.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
            {services.map((item) => (
              <li key={item.service.id}>
                <DomainServiceCard item={item} categorySlug={categorySlug} />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3.5 text-center sm:mt-4">
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

      <SectionShell
        id="beginner"
        tone="gray"
        className="!py-0"
        innerClassName="!py-5 sm:!py-6"
      >
        <SectionHeader
          title="ドメイン選びが初めての方へ"
          description="ドメインの基礎知識を、初心者向けに分かりやすくまとめています。"
          className="!mb-0"
        />
        <ul className="mt-3 grid gap-2 sm:mt-3.5 sm:grid-cols-2">
          {beginnerLinks.map((link) => (
            <li key={link.articleSlug}>
              <Link
                href={link.href}
                className="flex min-h-11 items-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-3.5 text-[13px] font-medium text-[var(--navy)] transition hover:border-[var(--navy)]/30 hover:bg-[var(--surface)]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </SectionShell>

      <SectionShell
        id="faq"
        tone="white"
        className="!py-0"
        innerClassName="!pt-5 !pb-[calc(var(--section-py)+4.5rem)] sm:!pt-6 sm:!pb-[calc(var(--section-py-md)+3rem)]"
      >
        <div className="relative z-30 mx-auto max-w-3xl">
          <SectionHeader
            title="よくある質問"
            description="ドメイン選びに関するよくある疑問をまとめました。"
            className="!mb-0"
          />
          <div className="mt-3 sm:mt-3.5">
            <FaqAccordion items={DOMAIN_FAQS} />
          </div>
        </div>
      </SectionShell>
    </div>
  );
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

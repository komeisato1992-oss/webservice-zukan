import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Gauge,
  HardDrive,
  Headphones,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  PAGE_SECTION_NAV,
  PURPOSE_OPTIONS,
  SELECTION_GUIDES,
  SERVER_FAQS,
} from "@/lib/site/content";
import { CompareCategoryNav } from "@/components/site/compare-category-nav";
import type { ServerTopData } from "@/lib/site/public-data";
import { buildCompareRows } from "@/lib/site/compare-rows";
import { SITE_BRAND } from "@/lib/site/brand";
import { categoryPath } from "@/lib/links";
import { getSiteUrl } from "@/lib/site/seo";
import type { PublicContentCard } from "@/lib/contents/types";
import { PopularCompareTable } from "@/components/site/popular-compare-table";
import { PurposePicker } from "@/components/site/purpose-picker";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { HeroBackground } from "@/components/site/hero-background";
import { HeroCompareCard } from "@/components/site/hero-compare-card";
import { HeroStats } from "@/components/site/hero-stats";
import { LatestContents } from "@/components/site/latest-contents";
import { CompareNavigateLink } from "@/components/site/compare/compare-navigate-link";
import { CompareTableNote } from "@/components/site/compare/compare-table-note";
import type { ManagedRankingSet } from "@/lib/site/rankings-public";
import { RecommendedRanking } from "@/components/site/recommended-ranking";
import {
  SectionHeader,
  SectionShell,
  SiteLinkButton,
  buttonClass,
} from "@/components/site/ui";

const GUIDE_ICONS: LucideIcon[] = [
  Wallet,
  BadgeCheck,
  Gauge,
  HardDrive,
  Headphones,
];

type Props = {
  data: ServerTopData;
  latestContents?: PublicContentCard[];
  managedRankings?: Record<string, ManagedRankingSet>;
};

export function ServerTopPage({
  data,
  latestContents = [],
  managedRankings = {},
}: Props) {
  const {
    category,
    services,
    allCount,
    comparisonFields,
    featuredComparisonServices,
    topComparisonServices,
  } = data;
  const categorySlug = category.slug;

  const allSlugs = services.map((s) => s.service.slug);
  const heroServices = featuredComparisonServices;
  const popularServices = topComparisonServices;
  const jsonLd = buildJsonLd({
    allCount,
    latestContents,
    faqs: SERVER_FAQS,
    categorySlug,
  });

  const serviceCount = allCount > 0 ? allCount : 20;
  const fieldCount = Math.max(
    buildCompareRows(
      services.slice(0, Math.min(3, services.length)),
      comparisonFields,
    ).length,
    comparisonFields.length,
    1,
  );
  const guideHref = `${categoryPath(categorySlug)}#guide`;
  const sectionNav = PAGE_SECTION_NAV.filter(
    (item) =>
      item.href !== "#latest-contents" || latestContents.length > 0,
  );

  return (
    <div className="bg-white">
      <link
        rel="preload"
        as="image"
        href="/images/hero-bg.webp"
        type="image/webp"
        fetchPriority="high"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="hero-navy text-white">
        <HeroBackground />
        <div className="hero-navy-content relative mx-auto grid max-w-[90rem] gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,67fr)_minmax(0,33fr)] lg:items-center lg:gap-8 lg:px-10 lg:py-7 xl:gap-10">
          <div className="hero-copy-local min-w-0 max-w-xl lg:pr-2">
            <div className="flex max-w-full flex-col items-start gap-2.5 sm:gap-3">
              <Image
                src="/images/site-logo.png"
                alt={SITE_BRAND}
                width={280}
                height={61}
                sizes="(max-width: 640px) 188px, 224px"
                priority
                className="h-auto w-[11.75rem] max-w-full object-contain object-left sm:w-[14rem]"
              />
              <p className="inline-flex max-w-full items-center whitespace-nowrap rounded-full bg-[#4F8FEA] px-4 py-2 text-[13px] font-semibold leading-none tracking-tight text-white sm:px-5 sm:py-2.5 sm:text-[15px] sm:rounded-[999px]">
                <span className="jp-keep">レンタルサーバー徹底比較</span>
              </p>
            </div>
            <h1 className="hero-title-shadow mt-3 text-[2.125rem] font-extrabold leading-[1.2] tracking-tight text-white sm:mt-3.5 sm:text-[2.5rem] sm:leading-[1.18] lg:text-[3rem] lg:leading-[1.16]">
              迷ったら
              <br />
              主要サービスを比較
            </h1>
            <p className="hero-desc-shadow mt-2.5 max-w-lg text-[14px] leading-[1.7] text-white/90 text-pretty sm:mt-3 sm:text-[15px] lg:text-[15px]">
              人気・おすすめのレンタルサーバーを同じ基準で比較し、
              <span className="jp-keep">自分に合ったサービスを選べます。</span>
            </p>
            <div className="mt-4 flex flex-row flex-nowrap items-stretch gap-2 sm:mt-5 sm:gap-3">
              <CompareNavigateLink
                categorySlug={categorySlug}
                intent="all"
                allSlugs={allSlugs}
                className={buttonClass(
                  "onDark",
                  "md",
                  "h-11 min-w-0 flex-1 justify-center border border-white/90 px-2 text-[11px] font-semibold whitespace-nowrap shadow-[0_4px_16px_rgba(0,0,0,0.25)] sm:flex-none sm:px-5 sm:text-[13px]",
                )}
              >
                <span className="jp-keep">より詳細を比較する →</span>
              </CompareNavigateLink>
              <Link
                href={guideHref}
                className={buttonClass(
                  "onDarkOutline",
                  "md",
                  "h-11 min-w-0 flex-1 justify-center border-white/70 bg-[rgba(6,21,47,0.55)] px-2.5 text-[12px] whitespace-nowrap hover:bg-[rgba(6,21,47,0.72)] sm:flex-none sm:px-5 sm:text-[13px]",
                )}
              >
                <span className="jp-keep">選び方ガイドを見る</span>
                <ArrowRight size={14} strokeWidth={2} aria-hidden className="hidden sm:inline" />
              </Link>
            </div>
          </div>

          <div className="min-w-0 w-full lg:max-w-[26rem] lg:justify-self-end xl:max-w-[28rem]">
            <HeroCompareCard
              categorySlug={categorySlug}
              services={heroServices}
              fields={comparisonFields}
            />
          </div>
        </div>
      </section>

      <HeroStats serviceCount={serviceCount} fieldCount={fieldCount} />

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

      <RecommendedRanking
        categorySlug={categorySlug}
        managedRankings={managedRankings}
        services={services}
      />

      <SectionShell
        id="compare-categories"
        tone="compare"
        className="!pt-[calc(var(--section-py)*0.33)] !pb-[calc(var(--section-py)*0.4)] sm:!pt-[calc(var(--section-py-md)*0.33)] sm:!pb-[calc(var(--section-py-md)*0.4)] lg:!pt-[calc(var(--section-py-lg)*0.33)] lg:!pb-[calc(var(--section-py-lg)*0.4)]"
      >
        <SectionHeader
          title="おすすめレンタルサーバー徹底比較"
          description="おすすめのレンタルサーバーを、料金・容量・機能・サポートなどの条件から比較できます。複数プランがあるサービスは、プランを切り替えて確認できます。"
          emphasis
          className="!mb-0"
        />
        <CompareCategoryNav />
        <CompareTableNote className="mt-2.5 sm:mt-3" />
        <div className="mt-3 sm:mt-2.5">
          <PopularCompareTable
            categorySlug={categorySlug}
            services={popularServices}
            fields={comparisonFields}
            allSlugs={allSlugs}
          />
        </div>
      </SectionShell>

      <SectionShell
        id="purpose-picker"
        tone="gray"
        className="!py-[calc(var(--section-py)*0.33)] sm:!py-[calc(var(--section-py-md)*0.33)] lg:!py-[calc(var(--section-py-lg)*0.33)]"
      >
        <SectionHeader
          title="重視したい条件から探す"
          description="条件を選ぶと、編集部おすすめのランキングがその場で切り替わります。"
          className="!mb-0"
        />
        <PurposePicker
          options={PURPOSE_OPTIONS}
          categorySlug={categorySlug}
          managedRankings={managedRankings}
        />
      </SectionShell>

      {latestContents.length > 0 ? (
        <SectionShell id="latest-contents" tone="white">
          <SectionHeader
            title="サーバー最新情報"
            description="運営が確認したお知らせ・キャンペーン・更新情報を掲載しています。"
          />
          <LatestContents
            items={latestContents}
            categorySlug={categorySlug}
          />
        </SectionShell>
      ) : null}

      <SectionShell
        id="guide"
        tone="gray"
        className="!py-[calc(var(--section-py)*0.33)] sm:!py-[calc(var(--section-py-md)*0.33)]"
      >
        <SectionHeader
          title="サーバー選びのポイント"
          description="初心者でも押さえやすい、5つの確認ポイントです。"
          className="!mb-0"
        />
        <ol className="mt-2.5 grid gap-x-5 gap-y-3 sm:mt-3 sm:grid-cols-2 lg:grid-cols-5">
          {SELECTION_GUIDES.map((g, i) => {
            const Icon = GUIDE_ICONS[i] ?? BadgeCheck;
            return (
              <li key={g.number} className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Icon
                    size={14}
                    strokeWidth={1.75}
                    className="text-[var(--navy)]"
                    aria-hidden
                  />
                  <span className="text-[10px] tabular-nums text-[var(--text-muted)]">
                    {String(g.number).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-1 text-[12px] font-semibold leading-snug text-[var(--text-primary)] sm:text-[13px]">
                  {g.title}
                </h3>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--text-body)]">
                  {g.summary}
                </p>
              </li>
            );
          })}
        </ol>
      </SectionShell>

      <SectionShell id="all-services" tone="white" className="!py-2.5 sm:!py-3.5">
        <SectionHeader
          title="掲載中のレンタルサーバー一覧"
          description="サービス名から詳細ページへ移動できます。"
        />
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {services.map((item) => (
            <li key={item.service.id}>
              <Link
                href={categoryPath(
                  categorySlug,
                  "services",
                  item.service.slug,
                )}
                className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-[var(--border)] bg-white px-2.5 py-2 text-center text-[12px] font-medium leading-snug text-[var(--navy)] transition duration-150 hover:border-[var(--navy)]/35 hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35 sm:text-[13px]"
              >
                <span className="jp-keep break-words">{item.service.name}</span>
              </Link>
            </li>
          ))}
        </ul>
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

      <SectionShell
        id="faq"
        tone="gray"
        className="!pb-[calc(var(--section-py)+4.5rem)] sm:!pb-[calc(var(--section-py-md)+3rem)]"
      >
        <div className="relative z-30 mx-auto max-w-3xl">
          <SectionHeader
            title="よくある質問"
            description="レンタルサーバー選びでよく聞かれるポイントをまとめました。"
          />
          <div className="mt-4 sm:mt-5">
            <FaqAccordion items={SERVER_FAQS} />
          </div>
        </div>
      </SectionShell>
    </div>
  );
}

function buildJsonLd({
  allCount,
  latestContents,
  faqs,
  categorySlug,
}: {
  allCount: number;
  latestContents: PublicContentCard[];
  faqs: typeof SERVER_FAQS;
  categorySlug: string;
}) {
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/${categorySlug}`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: SITE_BRAND,
          item: pageUrl,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${SITE_BRAND} | 主要20サービスを比較`,
      description: buildServerTopDescriptionInline(allCount),
      url: pageUrl,
      isPartOf: {
        "@type": "WebSite",
        name: SITE_BRAND,
        url: siteUrl,
      },
    },
    ...(latestContents.length > 0
      ? [
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "サーバー最新情報",
            itemListElement: latestContents.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.title,
            })),
          },
        ]
      : []),
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

function buildServerTopDescriptionInline(serviceCount: number): string {
  const countLabel = serviceCount > 0 ? `${serviceCount}社` : "主要サービス";
  return `${countLabel}のレンタルサーバーを料金・容量・WordPress機能・サポートなどで比較し、目的に合うサービスを検討できます。`;
}

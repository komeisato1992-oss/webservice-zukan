import type { Metadata } from "next";
import Link from "next/link";
import { listGuides } from "@/lib/guides/registry";
import { PRIMARY_CATEGORY_SLUG, SITE_BRAND } from "@/lib/site/brand";
import { getSiteUrl } from "@/lib/site/seo";
import { SiteBadge } from "@/components/site/site-badge";
import { Breadcrumb } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "ガイド記事一覧",
  description:
    "レンタルサーバーの選び方・おすすめ比較など、サーバー図鑑のガイド記事一覧です。",
  alternates: { canonical: "/guides" },
  openGraph: {
    title: `ガイド記事一覧 | ${SITE_BRAND}`,
    description:
      "レンタルサーバーの選び方・おすすめ比較など、サーバー図鑑のガイド記事一覧です。",
    url: `${getSiteUrl()}/guides`,
    siteName: SITE_BRAND,
    locale: "ja_JP",
    type: "website",
  },
};

export default function GuidesIndexPage() {
  const guides = listGuides();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumb
        items={[
          { href: `/${PRIMARY_CATEGORY_SLUG}`, label: "トップ" },
          { label: "ガイド" },
        ]}
      />
      <h1 className="mt-3 text-[1.625rem] font-bold tracking-tight text-[var(--text-primary)] sm:text-[2rem]">
        ガイド
      </h1>
      <p className="mt-2 text-[14px] text-[var(--text-body)] sm:text-[15px]">
        レンタルサーバーの選び方やおすすめ比較ガイドです。
      </p>
      <ul className="mt-6 space-y-4">
        {guides.map((guide) => (
          <li
            key={guide.slug}
            className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4 sm:p-5"
          >
            <div className="flex flex-wrap gap-1.5">
              {guide.categories.map((cat) => (
                <SiteBadge key={cat} variant="featured">
                  {cat}
                </SiteBadge>
              ))}
            </div>
            <h2 className="mt-2 text-[15px] font-bold leading-snug text-[var(--text-primary)] sm:text-base">
              <Link
                href={`/guides/${guide.slug}`}
                className="hover:text-[var(--accent)]"
              >
                {guide.title}
              </Link>
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-body)]">
              {guide.description}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

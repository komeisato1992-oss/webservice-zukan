"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { categoryPath } from "@/lib/links";
import type { EnrichedService } from "@/lib/site/service-utils";
import { ServiceLogo } from "@/components/site/service-logo";
import { AddToCompareButton } from "@/components/site/compare/add-to-compare-button";
import { buttonClass, SiteCard } from "@/components/site/ui";

type Section = {
  id: string;
  title: string;
  purposeId: string;
  items: EnrichedService[];
  meta?: { checkItems: string; caution: string };
};

type Props = {
  sections: Section[];
  categorySlug: string;
};

export function PurposeTabs({ sections, categorySlug }: Props) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (sections.some((s) => s.id === hash)) setActive(hash);
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [sections]);

  const current = sections.find((s) => s.id === active) ?? sections[0];

  return (
    <div>
      <div
        className="scroll-row flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="目的別"
      >
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={current?.id === section.id}
            onClick={() => {
              setActive(section.id);
              window.history.replaceState(null, "", `#${section.id}`);
            }}
            className={`h-8 shrink-0 rounded-md px-3 text-[12px] font-medium whitespace-nowrap transition ${
              current?.id === section.id
                ? "bg-[var(--navy)] text-white"
                : "bg-white text-[var(--text-primary)] ring-1 ring-[var(--border)] hover:bg-[var(--surface)]"
            }`}
          >
            {section.title}
            <span className="ml-1 text-[11px] opacity-80">
              ({section.items.length})
            </span>
          </button>
        ))}
      </div>

      {current ? (
        <div className="mt-5" role="tabpanel">
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
            {current.title}
          </h3>
          {current.meta ? (
            <div className="mt-2 space-y-1 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-[12px] leading-relaxed text-[var(--text-body)] sm:text-[13px]">
              <p>
                <span className="font-medium text-[var(--navy)]">
                  確認する項目：
                </span>
                {current.meta.checkItems}
              </p>
              <p>
                <span className="font-medium text-[var(--navy)]">注意点：</span>
                {current.meta.caution}
              </p>
            </div>
          ) : null}
          {current.items.length === 0 ? (
            <p className="mt-3 border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-body)]">
              この目的に紐づくサービス情報がまだありません。比較表やサービス一覧から探してみてください。
            </p>
          ) : (
            <div className="scroll-row mt-3 flex gap-2.5 overflow-x-auto pb-1">
              {current.items.map((item) => {
                const s = item.service;
                const detailHref = categoryPath(
                  categorySlug,
                  "services",
                  s.slug,
                );
                return (
                  <SiteCard
                    key={s.id}
                    className="flex w-[240px] shrink-0 flex-col !p-3.5 sm:w-[260px]"
                    hover
                  >
                    <div className="flex items-start gap-2.5">
                      <ServiceLogo
                        name={s.name}
                        logoUrl={s.logo_url}
                        size="md"
                        fallback="none"
                      />
                      <div className="min-w-0">
                        <Link
                          href={detailHref}
                          className="text-sm font-bold text-[var(--text-primary)] hover:text-[var(--accent)] jp-keep"
                        >
                          {s.name}
                        </Link>
                        {s.catchphrase ? (
                          <p className="mt-1 line-clamp-2 text-xs text-[var(--text-body)]">
                            {s.catchphrase}
                          </p>
                        ) : null}
                        {s.recommended_uses ? (
                          <p className="mt-1.5 line-clamp-1 text-[11px] text-[var(--text-muted)]">
                            向いている人：{s.recommended_uses}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-auto flex flex-col gap-1.5 pt-3.5">
                      <AddToCompareButton
                        slug={s.slug}
                        name={s.name}
                        categorySlug={categorySlug}
                        emphasis="primary"
                      />
                      <Link
                        href={detailHref}
                        className={buttonClass("secondary", "sm")}
                      >
                        特徴・料金を見る
                      </Link>
                      <Link
                        href={`${categoryPath(categorySlug, "compare")}?slugs=${s.slug}`}
                        className="text-center text-[11px] font-medium text-[var(--accent)] hover:underline"
                      >
                        比較ページで確認
                      </Link>
                    </div>
                  </SiteCard>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { DOMAIN_RANKING_PURPOSE_OPTIONS } from "@/lib/site/content";
import type { ManagedRankingSet } from "@/lib/site/rankings-public";
import { DomainRankingCard } from "@/components/site/domain-ranking-card";
import { SectionShell, cn } from "@/components/site/ui";

type Props = {
  categorySlug: string;
  managedRankings: Record<string, ManagedRankingSet>;
};

const DEFAULT_PURPOSE_ID = DOMAIN_RANKING_PURPOSE_OPTIONS[0]?.id ?? "overall";

/**
 * ドメイン図鑑TOPのランキング。
 * カテゴリは管理画面と同じ DOMAIN_RANKING_PURPOSE_OPTIONS を使用。
 */
export function DomainRecommendedRanking({
  categorySlug,
  managedRankings,
}: Props) {
  const [activeId, setActiveId] = useState(DEFAULT_PURPOSE_ID);

  const activeSet = managedRankings[activeId];
  const items = (activeSet?.items ?? [])
    .filter((c) => c.rank >= 1 && c.rank <= 3)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3);

  const pcCols =
    items.length <= 1
      ? "sm:grid-cols-1"
      : items.length === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-3";

  return (
    <SectionShell
      id="recommended-ranking"
      tone="white"
      className="!py-0"
      innerClassName="!pt-4 !pb-3.5 sm:!pt-5 sm:!pb-5"
    >
      <div className="flex flex-col gap-2.5 sm:gap-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-2">
          <h2 className="shrink-0 text-[1.25rem] font-bold leading-snug tracking-tight text-[var(--text-primary)] sm:text-[1.5rem] lg:text-[1.625rem]">
            ランキング
          </h2>

          <div
            className={cn(
              "-mx-4 flex gap-1.5 overflow-x-auto overscroll-x-contain px-4 pb-0.5",
              "snap-x snap-mandatory touch-pan-x",
              "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
              "sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 sm:snap-none",
            )}
            role="tablist"
            aria-label="ランキングカテゴリ"
          >
            {DOMAIN_RANKING_PURPOSE_OPTIONS.map((tab) => {
              const active = activeId === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveId(tab.id)}
                  className={cn(
                    "h-9 shrink-0 snap-start rounded-lg px-3.5 text-[13px] font-medium transition duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35",
                    active
                      ? "bg-[var(--navy-deep)] text-white"
                      : "border border-[var(--accent)] bg-white text-[var(--navy-deep)] hover:bg-[var(--accent-soft)]",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="max-w-xl text-[13px] leading-relaxed text-[var(--text-body)] sm:text-sm">
          目的に合わせて、おすすめのドメインサービスを確認できます。
        </p>
      </div>

      <div
        key={activeId}
        role="tabpanel"
        className="ui-fade-in mt-3 sm:mt-3.5"
        style={{ animationDuration: "130ms" }}
      >
        {items.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center text-sm text-[var(--text-body)]">
            現在ランキングを準備中です。
          </p>
        ) : (
          <>
            <ul
              className={cn(
                "scroll-row flex gap-3 overflow-x-auto overscroll-x-contain pb-1.5",
                "snap-x snap-mandatory touch-pan-x",
                "pr-6 sm:pr-0",
                "sm:grid sm:gap-4 sm:overflow-visible sm:pb-0 sm:snap-none",
                pcCols,
              )}
            >
              {items.map((card) => (
                <li
                  key={`${card.purposeId}-${card.rank}-${card.service.id}`}
                  className="flex snap-start sm:min-w-0"
                >
                  <DomainRankingCard
                    card={card}
                    categorySlug={categorySlug}
                    buttonLocation="domain_recommended_ranking"
                  />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-center text-[11px] text-[var(--text-muted)] sm:hidden">
              ← 左右にスワイプ →
            </p>
          </>
        )}
      </div>
    </SectionShell>
  );
}

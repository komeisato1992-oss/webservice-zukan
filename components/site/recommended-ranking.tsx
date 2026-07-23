"use client";

import { useState } from "react";
import Link from "next/link";
import { TOP_RANKING_TABS } from "@/lib/site/content";
import type { ManagedRankingSet } from "@/lib/site/rankings-public";
import type { EnrichedService } from "@/lib/site/service-utils";
import { withSelectedPlan } from "@/lib/site/plan-utils";
import { categoryPath } from "@/lib/links";
import { RankingCard } from "@/components/site/ranking-card";
import { usePlanSelection } from "@/components/site/compare/use-plan-selection";
import { useCompare } from "@/components/site/compare/compare-context";
import { SectionHeader, SectionShell, buttonClass, cn } from "@/components/site/ui";

type Props = {
  categorySlug: string;
  managedRankings: Record<string, ManagedRankingSet>;
  /** TOP 全サービス（比較表セット用） */
  services: EnrichedService[];
};

export function RecommendedRanking({
  categorySlug,
  managedRankings,
  services,
}: Props) {
  const [activeId, setActiveId] = useState<string>(
    TOP_RANKING_TABS[0].purposeId,
  );
  const { setPlan } = usePlanSelection(services);
  const { replace } = useCompare();

  const activeSet = managedRankings[activeId];
  const items = (activeSet?.items ?? [])
    .filter((c) => c.rank >= 1 && c.rank <= 3)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3);

  const compareHrefSlugs = items
    .map((card) => {
      const found = services.find((s) => s.service.id === card.service.id);
      return found?.service.slug;
    })
    .filter((slug): slug is string => Boolean(slug));
  const compareHref =
    compareHrefSlugs.length > 0
      ? `${categoryPath(categorySlug, "compare")}?slugs=${compareHrefSlugs.join(",")}`
      : categoryPath(categorySlug, "compare");

  function prepareCompareSelection() {
    if (items.length === 0) return;

    const compareItems: Array<{
      slug: string;
      name: string;
      categorySlug: string;
    }> = [];

    for (const card of items) {
      const found = services.find((s) => s.service.id === card.service.id);
      if (!found) continue;
      const withPlan = withSelectedPlan(found, card.planId);
      if (card.planId) setPlan(card.service.id, card.planId);
      else if (withPlan.representativePlan?.id) {
        setPlan(card.service.id, withPlan.representativePlan.id);
      }
      compareItems.push({
        slug: card.service.slug,
        name: card.service.name,
        categorySlug,
      });
    }
    if (compareItems.length === 0) return;

    // 比較ページの選択をランキング3件で上書き（TOP比較表は触らない）
    replace(compareItems);
  }

  return (
    <SectionShell
      id="recommended-ranking"
      tone="white"
      className="!pt-[calc(var(--section-py)*0.4)] !pb-[calc(var(--section-py)*0.45)] sm:!pt-[calc(var(--section-py-md)*0.4)] sm:!pb-[calc(var(--section-py-md)*0.45)]"
    >
      <SectionHeader
        title="おすすめランキング"
        description="編集部が用途別におすすめするレンタルサーバーを紹介しています。"
        emphasis
        className="!mb-0"
      />

      <div
        className="mt-4 flex flex-wrap gap-1.5 sm:mt-5 sm:justify-center"
        role="tablist"
        aria-label="ランキングカテゴリ"
      >
        {TOP_RANKING_TABS.map((tab) => {
          const active = activeId === tab.purposeId;
          return (
            <button
              key={tab.purposeId}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveId(tab.purposeId)}
              className={cn(
                "h-9 rounded-lg px-3.5 text-[13px] font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35",
                active
                  ? "bg-[var(--navy)] text-white"
                  : "border border-[var(--border)] bg-white text-[var(--text-body)] hover:border-[var(--navy)]/30 hover:bg-[var(--surface)]",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        key={activeId}
        role="tabpanel"
        className="ui-fade-in mt-4 sm:mt-5"
        style={{ animationDuration: "130ms" }}
      >
        {items.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--text-body)]">
            このカテゴリのランキングは準備中です。比較表からサービスを確認できます。
          </p>
        ) : (
          <>
            <ul
              className={cn(
                "scroll-row flex gap-3 overflow-x-auto pb-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:pb-0",
                "snap-x snap-mandatory sm:snap-none",
                "pr-6 sm:pr-0",
              )}
            >
              {items.map((card) => (
                <li
                  key={`${card.purposeId}-${card.rank}-${card.service.id}`}
                  className="snap-start sm:min-w-0"
                >
                  <RankingCard
                    card={card}
                    categorySlug={categorySlug}
                    buttonLocation="recommended_ranking"
                  />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-center text-[11px] text-[var(--text-muted)] sm:hidden">
              ← 左右にスワイプして比較 →
            </p>
            <div className="mt-4 flex justify-center sm:mt-5">
              <Link
                href={compareHref}
                onClick={prepareCompareSelection}
                className={cn(
                  buttonClass("primary", "md"),
                  "min-w-[14rem] px-5 text-[13px] font-semibold",
                )}
              >
                これらのサーバーを比較する
              </Link>
            </div>
          </>
        )}
      </div>
    </SectionShell>
  );
}

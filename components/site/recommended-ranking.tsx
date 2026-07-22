"use client";

import { useState } from "react";
import Link from "next/link";
import { TOP_RANKING_TABS } from "@/lib/site/content";
import type { ManagedRankingCard, ManagedRankingSet } from "@/lib/site/rankings-public";
import type { EnrichedService } from "@/lib/site/service-utils";
import { withSelectedPlan } from "@/lib/site/plan-utils";
import { categoryPath, resolveOutboundLink } from "@/lib/links";
import { OfficialSiteButton } from "@/components/site/official-site-button";
import { usePlanSelection } from "@/components/site/compare/use-plan-selection";
import { useCompare } from "@/components/site/compare/compare-context";
import { SectionHeader, SectionShell, buttonClass, cn } from "@/components/site/ui";

type Props = {
  categorySlug: string;
  managedRankings: Record<string, ManagedRankingSet>;
  /** TOP 全サービス（比較表セット用） */
  services: EnrichedService[];
};

const RANK_MEDAL: Record<1 | 2 | 3, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

function rankFrameClass(rank: 1 | 2 | 3): string {
  if (rank === 1) {
    return "border-[3px] border-[#D4A017] bg-[#FFF9EB]";
  }
  if (rank === 2) {
    return "border-2 border-[#A8B0BC] bg-[#F4F6F8]";
  }
  return "border border-[var(--navy)] bg-white";
}

/** ★評価（0〜5、小数対応）。例: 4.5 → ★★★★☆ */
function StarRow({ rating }: { rating: number | null }) {
  if (rating == null) {
    return (
      <p className="text-[12px] text-[var(--text-muted)]" aria-label="評価未設定">
        —
      </p>
    );
  }
  const clamped = Math.min(5, Math.max(0, rating));
  const full = Math.floor(clamped);
  const frac = clamped - full;
  const half = frac >= 0.25 && frac < 0.75;
  const extraFull = frac >= 0.75 ? 1 : 0;
  const filled = full + extraFull;
  const stars: string[] = [];
  for (let i = 0; i < 5; i++) {
    if (i < filled) stars.push("★");
    else if (i === filled && half) stars.push("☆");
    else stars.push("☆");
  }
  return (
    <p
      className="text-[13px] leading-none tracking-tight text-amber-500"
      aria-label={`編集部評価 ${clamped}`}
    >
      <span aria-hidden>{stars.join("")}</span>
      <span className="ml-1 text-[11px] tabular-nums text-[var(--text-muted)]">
        {clamped % 1 === 0 ? clamped.toFixed(0) : clamped.toFixed(1)}
      </span>
    </p>
  );
}

function RankingCard({
  card,
  categorySlug,
}: {
  card: ManagedRankingCard;
  categorySlug: string;
}) {
  const detailHref = categoryPath(
    categorySlug,
    "services",
    card.service.slug,
  );
  const outbound = resolveOutboundLink(card.service, card.affiliateLinks);
  const rank = card.rank;

  return (
    <article
      className={cn(
        "flex h-full min-h-[18.5rem] w-[15.5rem] shrink-0 flex-col rounded-[var(--radius-card)] px-3.5 py-3 sm:w-auto sm:min-w-0",
        rankFrameClass(rank),
      )}
    >
      <p className="text-[12px] font-bold tabular-nums text-[var(--text-primary)]">
        <span aria-hidden className="mr-1">
          {RANK_MEDAL[rank]}
        </span>
        {rank}位
      </p>

      <h3 className="mt-2 text-center text-[18px] font-extrabold leading-snug tracking-tight text-[var(--text-primary)] sm:text-[19px]">
        <span className="jp-break">{card.service.name}</span>
      </h3>

      {card.planName ? (
        <p className="mt-0.5 text-center text-[11px] text-[var(--text-muted)]">
          {card.planName}
        </p>
      ) : (
        <p className="mt-0.5 text-center text-[11px] text-transparent" aria-hidden>
          —
        </p>
      )}

      <div className="mt-1.5 flex justify-center">
        <StarRow rating={card.rating} />
      </div>

      {/* 約120〜140字 / 4行相当 */}
      <p className="mt-1.5 line-clamp-4 min-h-[5.6em] text-center text-[12px] leading-[1.4] text-[var(--text-body)]">
        {card.cardComment || "\u00A0"}
      </p>

      <div className="mt-2 text-center">
        <p className="text-[10px] text-[var(--text-muted)]">月額料金</p>
        <p className="mt-0.5 text-[16px] font-bold tabular-nums text-[var(--navy)]">
          {card.monthlyLabel}
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-1.5 pt-3">
        {outbound ? (
          <OfficialSiteButton
            href={outbound.href}
            isAffiliate={outbound.isAffiliate}
            label="公式サイトを見る"
            size="sm"
          />
        ) : (
          <span
            className={cn(
              buttonClass("secondary", "sm"),
              "pointer-events-none w-full opacity-40",
            )}
          >
            公式サイトを見る
          </span>
        )}
        <Link
          href={detailHref}
          className={cn(buttonClass("secondary", "sm"), "w-full")}
        >
          詳細を見る
        </Link>
      </div>
    </article>
  );
}

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
                  <RankingCard card={card} categorySlug={categorySlug} />
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

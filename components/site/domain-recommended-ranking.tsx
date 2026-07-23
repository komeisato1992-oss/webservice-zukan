import type { ManagedRankingSet } from "@/lib/site/rankings-public";
import { DomainRankingCard } from "@/components/site/domain-ranking-card";
import {
  SectionHeader,
  SectionShell,
  cn,
} from "@/components/site/ui";

type Props = {
  categorySlug: string;
  managedRankings: Record<string, ManagedRankingSet>;
};

/** 総合おすすめを最大5件表示（管理データの rank 1〜） */
export function DomainRecommendedRanking({
  categorySlug,
  managedRankings,
}: Props) {
  const overall = managedRankings.overall;
  const items = (overall?.items ?? [])
    .filter((c) => c.rank >= 1 && c.rank <= 5)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5);

  const pcCols =
    items.length <= 1
      ? "sm:grid-cols-1"
      : items.length === 2
        ? "sm:grid-cols-2"
        : items.length === 3
          ? "sm:grid-cols-3"
          : "sm:grid-cols-4";

  return (
    <SectionShell
      id="recommended-ranking"
      tone="white"
      className="!py-0"
      innerClassName="!pt-4 !pb-3.5 sm:!pt-5 sm:!pb-5"
    >
      <SectionHeader
        title="人気ランキング"
        description="編集部の総合おすすめドメインサービスです。"
        emphasis
        className="!mb-0"
      />

      <div className="mt-3 sm:mt-3.5">
        {items.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center text-sm text-[var(--text-body)]">
            ランキングは準備中です。比較表から各社の違いを確認できます。
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

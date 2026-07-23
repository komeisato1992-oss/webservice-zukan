import type { ManagedRankingSet } from "@/lib/site/rankings-public";
import { DomainRankingCard } from "@/components/site/domain-ranking-card";
import {
  SectionHeader,
  SectionShell,
  SiteLinkButton,
  cn,
} from "@/components/site/ui";
import { categoryPath } from "@/lib/links";

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
      className="!pt-[calc(var(--section-py)*0.45)] !pb-[calc(var(--section-py)*0.4)] sm:!pt-[calc(var(--section-py-md)*0.45)] sm:!pb-[calc(var(--section-py-md)*0.4)]"
    >
      <SectionHeader
        title="人気ランキング"
        description="編集部の総合おすすめドメインサービスです。"
        emphasis
        className="!mb-0"
      />

      <div className="mt-4 sm:mt-5">
        {items.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--text-body)]">
            ランキングは準備中です。サービス一覧から各社の詳細を確認できます。
          </p>
        ) : (
          <>
            <ul
              className={cn(
                "scroll-row flex gap-3 overflow-x-auto overscroll-x-contain pb-3",
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

      <div className="mt-4 flex justify-center sm:mt-5">
        <SiteLinkButton
          href={categoryPath(categorySlug, "compare")}
          variant="primary"
          size="md"
        >
          サービスを比較する
        </SiteLinkButton>
      </div>
    </SectionShell>
  );
}

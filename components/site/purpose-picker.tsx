"use client";

import { useEffect, useMemo } from "react";
import {
  Building2,
  Database,
  Gauge,
  HandHelping,
  Layers,
  LayoutTemplate,
  NotebookPen,
  Scale,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  PURPOSE_RANKING_TITLES,
  type PurposeOption,
} from "@/lib/site/content";
import type { ManagedRankingSet } from "@/lib/site/rankings-public";
import { usePurposeSelection } from "@/components/site/purpose-selection-context";
import { RankingCard } from "@/components/site/ranking-card";
import { cn } from "@/components/site/ui";

const PURPOSE_ICONS: Record<string, LucideIcon> = {
  beginner: Sparkles,
  blog: NotebookPen,
  cheap: Wallet,
  costperf: Scale,
  speed: Gauge,
  wordpress: LayoutTemplate,
  multi: Layers,
  business: Building2,
  support: HandHelping,
  storage: Database,
};

const DEFAULT_PURPOSE_ID = "beginner";

type Props = {
  options: PurposeOption[];
  categorySlug: string;
  /** 管理画面「ランキング管理」の公開データ */
  managedRankings?: Record<string, ManagedRankingSet>;
};

export function PurposePicker({
  options,
  categorySlug,
  managedRankings = {},
}: Props) {
  const { activeId, setActiveId, rankingRef } = usePurposeSelection();

  // デフォルトは「初心者向け」（ハッシュ未指定時）
  useEffect(() => {
    if (activeId) return;
    setActiveId(DEFAULT_PURPOSE_ID, { scroll: false });
  }, [activeId, setActiveId]);

  const selectedId = activeId ?? DEFAULT_PURPOSE_ID;

  const items = useMemo(() => {
    const set = managedRankings[selectedId];
    return (set?.items ?? [])
      .filter((c) => c.rank >= 1 && c.rank <= 3)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3);
  }, [managedRankings, selectedId]);

  const rankingTitle =
    PURPOSE_RANKING_TITLES[selectedId] ||
    `${options.find((o) => o.id === selectedId)?.label ?? ""}ランキング`;

  return (
    <div className="relative z-20 isolate mt-3 sm:mt-3.5">
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-4 lg:grid-cols-5">
        {options.map((option) => {
          const Icon = PURPOSE_ICONS[option.id] ?? Sparkles;
          const active = selectedId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              id={option.sectionId}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // スクロール位置は維持したままランキングだけ切替
                setActiveId(option.id, { scroll: false });
              }}
              className={cn(
                "group relative z-20 flex cursor-pointer touch-manipulation flex-col gap-0 rounded-[var(--radius-card)] border px-2 py-1.5 text-left transition duration-150 sm:px-2.5 sm:py-2 scroll-mt-28",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35",
                active
                  ? "border-[var(--navy)] bg-[var(--navy)] text-white shadow-sm"
                  : "border-[var(--border)] bg-white text-[var(--text-primary)] hover:-translate-y-0.5 hover:border-[var(--navy)] hover:shadow-sm",
              )}
              aria-pressed={active}
              aria-label={option.label}
            >
              <span
                className={cn(
                  "mb-0.5 inline-flex h-4 w-4 items-center justify-center rounded transition duration-150 sm:h-5 sm:w-5",
                  active
                    ? "bg-white/15 text-white"
                    : "bg-[var(--surface-navy-tint)] text-[var(--navy)]",
                )}
              >
                <Icon size={11} strokeWidth={1.75} aria-hidden />
              </span>
              <p
                className={cn(
                  "text-[13px] font-bold leading-tight sm:text-[14px]",
                  active ? "text-white" : "text-[var(--text-primary)]",
                )}
              >
                {option.label}
              </p>
              <p
                className={cn(
                  "mt-0.5 line-clamp-1 text-[11px] leading-tight sm:text-[12px]",
                  active ? "text-white/80" : "text-[var(--text-muted)]",
                )}
              >
                {option.description}
              </p>
            </button>
          );
        })}
      </div>

      <div
        ref={rankingRef}
        className="mt-4 scroll-mt-28 border-t border-[var(--border)] pt-4 sm:mt-5 sm:pt-5"
      >
        <h3 className="text-[15px] font-bold text-[var(--text-primary)] sm:text-base">
          {rankingTitle}
        </h3>
        <div
          key={selectedId}
          className="ui-fade-in mt-3"
          style={{ animationDuration: "200ms" }}
        >
          {items.length === 0 ? (
            <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center text-sm text-[var(--text-body)]">
              この条件のランキングはまだ登録されていません。管理画面のランキング管理から設定できます。
            </p>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}

export function purposeIcon(id: string): LucideIcon {
  return PURPOSE_ICONS[id] ?? Sparkles;
}

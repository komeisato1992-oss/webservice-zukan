"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
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
import { formatPlanLabelFromPlan } from "@/lib/site/service-name-display";
import type { ComparisonField } from "@/lib/types/database";
import type { EnrichedService } from "@/lib/site/service-utils";
import { recommendServicesForPurpose } from "@/lib/site/purpose-recommend";
import type { ManagedRankingSet } from "@/lib/site/rankings-public";
import { categoryPath, resolveOutboundLink } from "@/lib/links";
import { usePurposeSelection } from "@/components/site/purpose-selection-context";
import { AddToCompareButton } from "@/components/site/compare/add-to-compare-button";
import { OfficialSiteButton } from "@/components/site/official-site-button";
import { RankCornerBadge } from "@/components/site/site-badge";
import { ServiceLogo } from "@/components/site/service-logo";
import { buttonClass, cn, ICON_SM } from "@/components/site/ui";

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

type Props = {
  options: PurposeOption[];
  services: EnrichedService[];
  fields: ComparisonField[];
  categorySlug: string;
  counts?: Record<string, number>;
  /** 管理画面で公開されたランキング（あれば自動選定より優先） */
  managedRankings?: Record<string, ManagedRankingSet>;
};

export function PurposePicker({
  options,
  services,
  fields,
  categorySlug,
  counts = {},
  managedRankings = {},
}: Props) {
  const {
    activeId,
    setActiveId,
    rankingRef,
    pendingScroll,
    clearPendingScroll,
    scrollToRanking,
  } = usePurposeSelection();

  const managed = activeId ? managedRankings[activeId] : null;
  const recommendations = useMemo(() => {
    if (!activeId) return null;
    if (managed && managed.items.length > 0) {
      return {
        purposeId: activeId,
        items: managed.items.map((card) => {
          const enriched = services.find((s) => s.service.id === card.service.id);
          return {
            item:
              enriched ??
              ({
                service: card.service,
                affiliateLinks: card.affiliateLinks,
                plans: [],
                representativePlan: null,
                comparisonByFieldId: {},
                comparisonByPlanId: {},
                campaigns: [],
                highlightLabels: [],
              } as EnrichedService),
            reason: card.cardComment || "管理画面で選定されたおすすめサービスです。",
            metrics: [
              { label: "月額", value: card.monthlyLabel },
              { label: "容量", value: card.storageLabel },
            ],
            planNameOverride: card.planName,
          };
        }),
      };
    }
    const auto = recommendServicesForPurpose(activeId, services, fields);
    if (!auto) return null;
    return {
      ...auto,
      items: auto.items.map((i) => ({
        ...i,
        planNameOverride: null as string | null,
      })),
    };
  }, [activeId, managed, services, fields]);

  const rankingTitle =
    (activeId && PURPOSE_RANKING_TITLES[activeId]) ||
    (activeId
      ? `${options.find((o) => o.id === activeId)?.label ?? ""}ランキング`
      : "");

  // ランキング DOM が載ったあとにスクロール（即時 scroll だと ref が null）
  useEffect(() => {
    if (!pendingScroll || !activeId || !recommendations) return;
    scrollToRanking();
    clearPendingScroll();
  }, [
    pendingScroll,
    activeId,
    recommendations,
    scrollToRanking,
    clearPendingScroll,
  ]);

  return (
    <div className="relative z-20 isolate mt-3 sm:mt-3.5">
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4">
        {options.map((option) => {
          const Icon = PURPOSE_ICONS[option.id] ?? Sparkles;
          const count = counts[option.id] ?? 0;
          const active = activeId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              id={option.sectionId}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // 同じ条件でも解除せず、ランキング再表示＋スクロール
                setActiveId(option.id, { scroll: true });
              }}
              className={cn(
                "group relative z-20 flex min-h-[7.5rem] cursor-pointer touch-manipulation flex-col gap-1.5 rounded-[var(--radius-card)] border px-3 py-3 text-left transition duration-150 sm:min-h-[8rem] sm:px-3.5 sm:py-3.5 scroll-mt-28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35",
                "active:bg-[var(--surface-navy-tint)]/80",
                active
                  ? "border-[var(--navy)] bg-white shadow-sm ring-1 ring-[var(--navy)]/15"
                  : "border-[var(--border)] bg-white hover:border-[var(--navy)]/30 hover:bg-[var(--surface)]",
              )}
              aria-pressed={active}
              aria-label={`${option.label}${count > 0 ? `（${count}件）` : ""}`}
            >
              <div className="pointer-events-none flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--navy)] transition duration-150",
                    active
                      ? "bg-[var(--navy)] text-white"
                      : "bg-[var(--surface-navy-tint)]",
                  )}
                >
                  <Icon size={ICON_SM} strokeWidth={1.75} aria-hidden />
                </span>
                {count > 0 ? (
                  <span className="text-[12px] tabular-nums text-[var(--text-muted)]">
                    {count}件
                  </span>
                ) : (
                  <span className="text-[12px] text-[var(--text-muted)]">
                    準備中
                  </span>
                )}
              </div>
              <div className="pointer-events-none">
                <p className="text-[14px] font-semibold leading-snug text-[var(--text-primary)] sm:text-[15px]">
                  {option.label}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-[var(--text-muted)] sm:text-[13px]">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {recommendations ? (
        <div
          ref={rankingRef}
          className="ui-fade-in mt-4 scroll-mt-28 border-t border-[var(--border)] pt-4 sm:mt-5 sm:pt-5"
        >
          <h3 className="text-[15px] font-bold text-[var(--text-primary)] sm:text-base">
            {rankingTitle}
          </h3>
          {recommendations.items.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--text-body)]">
              条件に合う公開データがまだありません。比較表から確認してください。
            </p>
          ) : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-3">
              {recommendations.items.map((rec, index) => {
                const s = rec.item.service;
                const plan = rec.item.representativePlan;
                const detailHref = categoryPath(
                  categorySlug,
                  "services",
                  s.slug,
                );
                const outbound = resolveOutboundLink(
                  s,
                  rec.item.affiliateLinks,
                );
                const rank = index + 1;
                const planLabel =
                  ("planNameOverride" in rec && rec.planNameOverride) ||
                  formatPlanLabelFromPlan(plan);
                return (
                  <li
                    key={s.id}
                    className="relative flex flex-col rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-3.5 shadow-[var(--shadow-card)] transition duration-150 hover:shadow-[var(--shadow-card-hover)]"
                  >
                    <RankCornerBadge
                      rank={rank}
                      className="absolute left-2.5 top-2.5"
                    />
                    <div className="flex items-start gap-2.5 pt-1">
                      <div className="min-w-0 flex-1 pl-8">
                        <div className="flex items-center gap-2">
                          <ServiceLogo
                            name={s.name}
                            logoUrl={s.logo_url}
                            size="sm"
                            fallback="none"
                          />
                          <div className="min-w-0">
                            <p className="break-words text-[14px] font-bold text-[var(--text-primary)]">
                              <span className="jp-break">{s.name}</span>
                            </p>
                            {planLabel ? (
                              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                                {planLabel}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-body)]">
                          {rec.reason}
                        </p>
                        <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                          {rec.metrics.map((m) => (
                            <div key={m.label} className="flex gap-1">
                              <dt className="text-[var(--text-muted)]">
                                {m.label}
                              </dt>
                              <dd className="font-medium text-[var(--text-primary)]">
                                {m.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </div>
                    <div className="mt-auto flex flex-col gap-1.5 pt-3">
                      <AddToCompareButton
                        slug={s.slug}
                        name={s.name}
                        categorySlug={categorySlug}
                        emphasis="primary"
                      />
                      <div className="flex items-center gap-2">
                        <Link
                          href={detailHref}
                          className={`${buttonClass("secondary", "sm")} flex-1`}
                        >
                          詳細を見る
                        </Link>
                        {outbound ? (
                          <OfficialSiteButton
                            href={outbound.href}
                            isAffiliate={outbound.isAffiliate}
                            label="公式"
                            size="sm"
                            fullWidth={false}
                            className="min-w-[5.5rem] px-2"
                          />
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function purposeIcon(id: string): LucideIcon {
  return PURPOSE_ICONS[id] ?? Sparkles;
}

"use client";

import { useMemo } from "react";
import {
  Building2,
  Gauge,
  LayoutTemplate,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { PURPOSE_OPTIONS, PURPOSE_RANKING_TITLES } from "@/lib/site/content";
import type { ComparisonField } from "@/lib/types/database";
import type { EnrichedService } from "@/lib/site/service-utils";
import { recommendServicesForPurpose } from "@/lib/site/purpose-recommend";
import { usePurposeSelection } from "@/components/site/purpose-selection-context";
import { ServiceCard } from "@/components/site/service-card";
import { cn, ICON_SM } from "@/components/site/ui";

const CHIP_OPTIONS = [
  { id: "beginner", label: "初心者", icon: Sparkles },
  { id: "wordpress", label: "ブログ", icon: LayoutTemplate },
  { id: "business", label: "法人", icon: Building2 },
  { id: "speed", label: "高速", icon: Gauge },
  { id: "cheap", label: "コスパ", icon: Wallet },
] as const;

type Props = {
  categorySlug: string;
  services: EnrichedService[];
  fields: ComparisonField[];
};

export function ServicesListClient({
  categorySlug,
  services,
  fields,
}: Props) {
  const { activeId, setActiveId } = usePurposeSelection();

  const ranked = useMemo(() => {
    if (!activeId) return null;
    return recommendServicesForPurpose(activeId, services, fields);
  }, [activeId, services, fields]);

  const topSlugs = useMemo(() => {
    if (!ranked) return new Set<string>();
    return new Set(ranked.items.map((r) => r.item.service.slug));
  }, [ranked]);

  const rest = useMemo(() => {
    if (!ranked) return services;
    return services.filter((s) => !topSlugs.has(s.service.slug));
  }, [services, ranked, topSlugs]);

  const rankingTitle =
    (activeId && PURPOSE_RANKING_TITLES[activeId]) ||
    (activeId
      ? `${PURPOSE_OPTIONS.find((o) => o.id === activeId)?.label ?? ""}ランキング`
      : "");

  return (
    <div className="relative z-20 mt-5">
      <div>
        <p className="text-[13px] font-semibold text-[var(--text-primary)]">
          重視したい条件から探す
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5" role="list">
          {CHIP_OPTIONS.map((chip) => {
            const Icon = chip.icon as LucideIcon;
            const active = activeId === chip.id;
            return (
              <li key={chip.id}>
                <button
                  type="button"
                  onClick={() =>
                    setActiveId(
                      active ? null : chip.id,
                      { scroll: false },
                    )
                  }
                  className={cn(
                    "inline-flex h-8 touch-manipulation items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35 sm:text-[13px]",
                    active
                      ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                      : "border-[var(--border)] bg-white text-[var(--navy)] hover:border-[var(--navy)]/30 hover:bg-[var(--surface)]",
                  )}
                  aria-pressed={active}
                  aria-label={`${chip.label}で絞り込む`}
                >
                  <Icon size={ICON_SM} strokeWidth={1.75} aria-hidden />
                  <span className="jp-keep">{chip.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {ranked && ranked.items.length > 0 ? (
        <section className="ui-fade-in mt-5" aria-label={rankingTitle}>
          <h2 className="text-[15px] font-bold text-[var(--text-primary)] sm:text-base">
            {rankingTitle}
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-[var(--card-gap)] sm:grid-cols-3 sm:gap-[var(--card-gap-md)]">
            {ranked.items.map((rec, index) => (
              <li key={rec.item.service.id} className="min-w-0">
                <ServiceCard
                  service={rec.item.service}
                  categorySlug={categorySlug}
                  affiliateLinks={rec.item.affiliateLinks}
                  representativePlan={rec.item.representativePlan}
                  featureTags={rec.item.highlightLabels}
                  rank={index + 1}
                  featured
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div
        className={cn(
          "mt-5 grid gap-[var(--card-gap)] sm:gap-[var(--card-gap-md)]",
          ranked
            ? "grid-cols-2 lg:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {(ranked ? rest : services).map((item) => (
          <ServiceCard
            key={item.service.id}
            service={item.service}
            categorySlug={categorySlug}
            affiliateLinks={item.affiliateLinks}
            representativePlan={item.representativePlan}
            featureTags={item.highlightLabels}
          />
        ))}
      </div>
    </div>
  );
}

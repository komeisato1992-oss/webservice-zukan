"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import type { ComparisonField } from "@/lib/types/database";
import { buildHeroCompareRows } from "@/lib/site/compare-rows";
import { resolveFieldNameDisplay } from "@/lib/site/field-name-display";
import type { EnrichedService } from "@/lib/site/service-utils";
import { categoryPath } from "@/lib/links";
import { ServicePlanHeader } from "@/components/site/service-plan-header";
import { CompareNavigateLink } from "@/components/site/compare/compare-navigate-link";
import { CompareCellContent } from "@/components/site/compare/compare-cell-content";
import { buttonClass, cn, ICON_SM } from "@/components/site/ui";

type Props = {
  categorySlug: string;
  services: EnrichedService[];
  fields: ComparisonField[];
};

/**
 * ヒーロー内の人気3社プレビュー。
 * 代表プラン固定表示（プランドロップダウンなし）。
 * スマホは横スクロールなし・3列固定でカード内に収める。
 */
export function HeroCompareCard({
  categorySlug,
  services,
  fields,
}: Props) {
  const top = useMemo(() => services.slice(0, 3), [services]);
  const rows = useMemo(
    () => buildHeroCompareRows(top, fields),
    [top, fields],
  );
  const featuredSlugs = useMemo(
    () => top.map((s) => s.service.slug),
    [top],
  );

  if (top.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-white/20 bg-white p-5 shadow-[0_20px_48px_rgba(0,0,0,0.38)] ring-1 ring-black/5">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          比較プレビュー
        </p>
        <p className="mt-1 text-[13px] text-[var(--text-body)]">
          公開中のサービスはまだありません。
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-[var(--radius-card)] border border-slate-200/90 bg-white shadow-[0_20px_48px_rgba(0,0,0,0.38)] ring-1 ring-black/5 lg:max-w-none">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-2.5 py-1.5 sm:px-4 sm:py-2">
        <BarChart3
          size={ICON_SM}
          strokeWidth={1.75}
          className="shrink-0 text-[var(--navy)]"
          aria-hidden
        />
        <h2 className="min-w-0 text-[12px] font-semibold leading-snug text-[var(--text-primary)] sm:text-[14px]">
          <span className="jp-keep">人気3社の比較</span>
        </h2>
      </div>
      <p className="border-b border-[var(--border)] px-2.5 py-1.5 text-[10px] leading-snug text-[var(--text-muted)] sm:px-4 sm:text-[11px]">
        料金は12か月契約を目安です。最新情報は公式サイトでご確認ください。
      </p>

      <div className="overflow-hidden">
        <table
          className="w-full border-collapse text-left"
          style={{ tableLayout: "fixed" }}
        >
          <colgroup>
            <col style={{ width: "22%" }} />
            {top.map((item) => (
              <col key={item.service.id} style={{ width: "26%" }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                scope="col"
                className="compare-header-cell border-b border-r border-white/10 px-1 py-1.5 text-center align-middle text-[10px] font-bold text-white sm:px-2 sm:py-2 sm:text-[12px]"
              >
                <span className="jp-keep">項目</span>
              </th>
              {top.map((item) => (
                <th
                  key={item.service.id}
                  scope="col"
                  className="compare-header-cell border-b border-white/10 px-0.5 py-1.5 text-center align-top sm:px-1 sm:py-2"
                >
                  <ServicePlanHeader
                    serviceName={item.service.name}
                    planName={item.representativePlan?.name}
                    planDisplayName={item.representativePlan?.display_name}
                    logoUrl={item.service.logo_url}
                    href={categoryPath(
                      categorySlug,
                      "services",
                      item.service.slug,
                    )}
                    tone="dark"
                    size="sm"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const labelDisplay = resolveFieldNameDisplay(
                row.label,
                row.fieldSlug ?? row.id,
              );
              return (
              <tr key={row.id}>
                <th
                  scope="row"
                  className="compare-label-cell border-b border-r border-[var(--border)] px-1 py-1.5 text-center align-middle text-[9px] sm:px-2 sm:py-2 sm:text-[11px]"
                >
                  <span className="jp-keep break-words font-bold leading-snug">
                    {labelDisplay.lines.map((line, i) => (
                      <span key={`${line}-${i}`} className="block jp-keep whitespace-nowrap">
                        {line}
                      </span>
                    ))}
                  </span>
                </th>
                {row.cells.map((cell, i) => (
                  <td
                    key={`${row.id}-${top[i]?.service.id}`}
                    className={cn(
                      "border-b border-[var(--border)] px-0.5 py-1.5 text-center align-middle sm:px-1.5 sm:py-2",
                      cell.isBest || row.isHighlighted
                        ? "bg-[var(--accent-soft)]"
                        : "bg-white",
                    )}
                  >
                    <CompareCellContent
                      cell={cell}
                      fieldHighlighted={row.isHighlighted}
                      compact
                    />
                  </td>
                ))}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-2 sm:p-3">
        <CompareNavigateLink
          categorySlug={categorySlug}
          intent="slugs"
          forceSlugs={featuredSlugs}
          className={cn(
            buttonClass("primary", "md"),
            "h-10 w-full whitespace-nowrap text-[12px] font-semibold transition duration-150 sm:h-11 sm:text-[13px]",
          )}
        >
          <span className="jp-keep">より詳細を比較する →</span>
        </CompareNavigateLink>
      </div>
    </div>
  );
}

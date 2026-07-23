"use client";

import { ChevronDown } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import type { ComparisonField } from "@/lib/types/database";
import { UNGROUPED_LABEL } from "@/lib/types/comparison";
import { categoryPath, resolveOutboundLink } from "@/lib/links";
import { resolveGroupDescription } from "@/lib/site/field-help";
import {
  buildConfiguredCompareRows,
  buildPopularCompareRows,
  sortServicesByRow,
  type CompareRow,
} from "@/lib/site/compare-rows";
import {
  resolveComparePageFields,
  resolveTopTableFields,
} from "@/lib/site/comparison-display";
import type { EnrichedService } from "@/lib/site/service-utils";
import { PlanSwitcher } from "@/components/site/compare/plan-switcher";
import { usePlanSelection } from "@/components/site/compare/use-plan-selection";
import { CompareHScroll } from "@/components/site/compare/compare-h-scroll";
import { CompareCellContent } from "@/components/site/compare/compare-cell-content";
import { ComparisonMetricCell } from "@/components/site/compare/comparison-metric-cell";
import { ComparePinButton } from "@/components/site/compare/compare-pin-button";
import {
  orderWithPins,
  useComparePins,
} from "@/components/site/compare/compare-pins";
import { useCompareHover } from "@/components/site/compare/use-compare-hover";
import { OfficialSiteButton } from "@/components/site/official-site-button";
import { ServicePlanHeader } from "@/components/site/service-plan-header";
import { cn } from "@/components/site/ui";

const LABEL_COL = "var(--compare-label-col)";
const SERVICE_COL = "var(--compare-service-col)";
const SERVICE_COL_MOBILE_PX = 85;

export type ComparisonTableVariant = "top" | "compare";

export type ComparisonRowGroup = {
  group: string;
  description: string;
  rows: CompareRow[];
};

export function groupCompareRows(rows: CompareRow[]): ComparisonRowGroup[] {
  const order: string[] = [];
  const map = new Map<string, CompareRow[]>();
  for (const row of rows) {
    const group = row.displayGroup?.trim() || UNGROUPED_LABEL;
    if (!map.has(group)) {
      map.set(group, []);
      order.push(group);
    }
    map.get(group)!.push(row);
  }
  return order.map((group) => ({
    group,
    description: resolveGroupDescription(group),
    rows: map.get(group) ?? [],
  }));
}

/** 管理画面スロットに応じた表示項目 */
export function resolveFieldsForVariant(
  fields: ComparisonField[],
  variant: ComparisonTableVariant,
): ComparisonField[] {
  return variant === "top"
    ? resolveTopTableFields(fields)
    : resolveComparePageFields(fields);
}

function buildRows(
  variant: ComparisonTableVariant,
  services: EnrichedService[],
  fields: ComparisonField[],
): CompareRow[] {
  return variant === "top"
    ? buildPopularCompareRows(services, fields)
    : buildConfiguredCompareRows(services, fields);
}

/** サービス順だけ変わったとき、セル列を並べ替えて再計算を避ける */
function reorderRowCells(
  rows: CompareRow[],
  fromServices: EnrichedService[],
  toServices: EnrichedService[],
): CompareRow[] {
  if (fromServices === toServices) return rows;
  const fromIndex = new Map(
    fromServices.map((s, i) => [s.service.id, i] as const),
  );
  return rows.map((row) => ({
    ...row,
    cells: toServices.map((s) => {
      const idx = fromIndex.get(s.service.id) ?? -1;
      return (
        row.cells[idx] ?? {
          text: "—",
          raw: null,
          isBest: false,
          bestLabel: null,
        }
      );
    }),
  }));
}

type Props = {
  categorySlug: string;
  services: EnrichedService[];
  /** 全比較項目（スロット抽出は variant で行う） */
  fields: ComparisonField[];
  variant: ComparisonTableVariant;
  /** ピン固定（比較ページ） */
  enablePins?: boolean;
  /** カテゴリ見出し（比較ページ） */
  showGroups?: boolean;
  compactLabel?: boolean;
  denseMobile?: boolean;
  showMobileTips?: boolean;
  className?: string;
  tableId?: string;
  onPlanChangeExtra?: (serviceId: string, planId: string) => void;
};

/**
 * TOP徹底比較・比較ページ共通の比較表。
 * sticky は globals.css の `.compare-sticky-*` で一元管理する
 *（左上項目 / サービス名＋プラン名ヘッダー / 左列）。
 */
export function ComparisonTable({
  categorySlug,
  services,
  fields,
  variant,
  enablePins = false,
  showGroups = false,
  compactLabel = true,
  denseMobile = true,
  showMobileTips = true,
  className,
  tableId = "comparison-table",
  onPlanChangeExtra,
}: Props) {
  const displayFields = useMemo(
    () => resolveFieldsForVariant(fields, variant),
    [fields, variant],
  );

  const { selectedPlanIds, setPlan, resolvedServices } =
    usePlanSelection(services);

  const [sortRowId, setSortRowId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const hover = useCompareHover();

  const validSlugSet = useMemo(
    () => new Set(services.map((s) => s.service.slug)),
    [services],
  );
  const { pinnedSlugs, isPinned, togglePin } = useComparePins(validSlugSet);

  // 並び替え用に1回だけ行を構築（非ソート時は最終行と共有）
  const baseRows = useMemo(
    () => buildRows(variant, resolvedServices, fields),
    [variant, resolvedServices, fields],
  );

  const metricSorted = useMemo(() => {
    if (!sortRowId) return resolvedServices;
    const row = baseRows.find((r) => r.id === sortRowId);
    if (!row || row.kind === "text" || row.kind === "action") {
      return resolvedServices;
    }
    return sortServicesByRow(resolvedServices, row, "best-first");
  }, [resolvedServices, baseRows, sortRowId]);

  const orderedServices = useMemo(() => {
    if (!enablePins) return metricSorted;
    return orderWithPins(metricSorted, pinnedSlugs, (s) => s.service.slug);
  }, [enablePins, metricSorted, pinnedSlugs]);

  const rows = useMemo(() => {
    if (orderedServices === resolvedServices) return baseRows;
    // プラン選択は resolvedServices 順のまま → ピン／ソート時のみセル並べ替え
    const sameIds =
      orderedServices.length === resolvedServices.length &&
      orderedServices.every(
        (s, i) => s.service.id === resolvedServices[i]?.service.id,
      );
    if (sameIds) return baseRows;
    return reorderRowCells(baseRows, resolvedServices, orderedServices);
  }, [baseRows, orderedServices, resolvedServices]);

  const groups = useMemo(
    () => (showGroups ? groupCompareRows(rows) : null),
    [showGroups, rows],
  );

  const tableMinWidth = `calc(${LABEL_COL} + ${orderedServices.length} * ${SERVICE_COL})`;
  const showScrollHint = orderedServices.length > 3;
  const hasSortable = rows.some(
    (r) => r.kind !== "text" && r.kind !== "action",
  );

  const handlePlanChange = useCallback(
    (serviceId: string, planId: string) => {
      setPlan(serviceId, planId);
      onPlanChangeExtra?.(serviceId, planId);
    },
    [setPlan, onPlanChangeExtra],
  );

  const handleSort = useCallback((rowId: string) => {
    setSortRowId((cur) => (cur === rowId ? null : rowId));
  }, []);

  const toggleGroup = useCallback((group: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [group]: prev[group] === false,
    }));
  }, []);

  if (services.length === 0) {
    return (
      <p className="border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-body)] text-pretty">
        比較するサービスを選択してください
      </p>
    );
  }

  if (displayFields.length === 0) {
    return (
      <p className="border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-body)] text-pretty">
        現在、表示可能な比較項目がありません。
      </p>
    );
  }

  return (
    <div className={cn("space-y-2 sm:space-y-2.5", className)}>
      {showMobileTips && hasSortable ? (
        <p className="px-0.5 text-[11px] leading-snug text-[var(--text-muted)] sm:hidden">
          ⭐のある項目をタップすると、おすすめ順に並び替えます
        </p>
      ) : null}
      {showMobileTips && showScrollHint ? (
        <p className="px-0.5 text-[11px] leading-snug text-[var(--text-muted)] sm:hidden">
          右にスワイプして他のサービスを見る →
        </p>
      ) : null}

      <div
        id={tableId}
        className={cn(
          "comparison-table-shell compare-app",
          denseMobile && "compare-app--dense-mobile",
          "max-sm:-mx-2 overflow-hidden rounded-[var(--radius-card)] border border-[var(--navy)]/15 bg-white shadow-[var(--shadow-card)]",
        )}
      >
        <CompareHScroll
          showHints={showScrollHint}
          snapSizePx={SERVICE_COL_MOBILE_PX}
          scrollClassName="comparison-table-scroll"
        >
          <table
            className="border-collapse text-left"
            style={{
              fontSize: "12px",
              tableLayout: "fixed",
              width: tableMinWidth,
              minWidth: tableMinWidth,
            }}
          >
            <colgroup>
              <col style={{ width: LABEL_COL }} />
              {orderedServices.map((item) => (
                <col key={item.service.id} style={{ width: SERVICE_COL }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="compare-header-cell compare-sticky-corner border-b border-r border-white/10 px-1 py-1.5 text-center align-middle text-[10px] text-white sm:px-2.5 sm:py-3 sm:text-[12px]"
                >
                  項目
                </th>
                {orderedServices.map((item) => {
                  const plan =
                    item.plans?.find(
                      (p) => p.id === selectedPlanIds[item.service.id],
                    ) ?? item.representativePlan;
                  const pinned = enablePins && isPinned(item.service.slug);
                  return (
                    <th
                      key={item.service.id}
                      scope="col"
                      className={cn(
                        "compare-header-cell compare-sticky-header border-b border-white/10 px-0.5 py-1.5 text-center align-top sm:px-1.5 sm:py-3",
                        pinned && "shadow-[inset_0_3px_0_0_var(--accent)]",
                      )}
                    >
                      <div className="compare-sticky-header-inner relative mx-auto">
                        {enablePins ? (
                          <div className="absolute -right-0.5 -top-0.5 z-[1] sm:right-0 sm:top-0">
                            <ComparePinButton
                              serviceName={item.service.name}
                              pinned={pinned}
                              onToggle={() => togglePin(item.service.slug)}
                              tone="dark"
                            />
                          </div>
                        ) : null}
                        {enablePins ? (
                          pinned ? (
                            <span className="mb-0.5 rounded bg-white/15 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-white/90">
                              固定中
                            </span>
                          ) : (
                            <span
                              className="mb-0.5 h-3 sm:h-[18px]"
                              aria-hidden
                            />
                          )
                        ) : null}
                        {/* サービス名 → プラン名（常に2段。sticky 対象の本体） */}
                        <ServicePlanHeader
                          serviceName={item.service.name}
                          planName={plan?.name}
                          planDisplayName={plan?.display_name}
                          logoUrl={item.service.logo_url}
                          href={categoryPath(
                            categorySlug,
                            "services",
                            item.service.slug,
                          )}
                          tone="dark"
                          size="md"
                          showLogo={false}
                          showPlan
                        />
                        <PlanSwitcher
                          plans={item.plans ?? []}
                          selectedPlanId={
                            selectedPlanIds[item.service.id] ??
                            item.representativePlan?.id ??
                            null
                          }
                          onChange={(planId) =>
                            handlePlanChange(item.service.id, planId)
                          }
                          tone="dark"
                          hideWhenSingle
                          className="mt-0 max-w-full sm:max-w-[8.5rem]"
                        />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {groups
                ? groups.map((group) => {
                    const open = openGroups[group.group] !== false;
                    return (
                      <GroupBlock
                        key={group.group}
                        group={group}
                        open={open}
                        onToggle={() => toggleGroup(group.group)}
                        services={orderedServices}
                        colSpan={orderedServices.length + 1}
                        hover={hover}
                        sortRowId={sortRowId}
                        onSort={handleSort}
                        compactLabel={compactLabel}
                      />
                    );
                  })
                : rows.map((row) => (
                    <DataRow
                      key={row.id}
                      row={row}
                      services={orderedServices}
                      hover={hover}
                      sortRowId={sortRowId}
                      onSort={handleSort}
                      compactLabel={compactLabel}
                    />
                  ))}
              <tr>
                <th
                  scope="row"
                  className="compare-label-cell compare-sticky-label border-b border-r border-[var(--border)] bg-[var(--surface)] px-1 py-2 text-center align-middle text-[10px] font-semibold text-[var(--text-muted)] sm:px-2 sm:text-[11px]"
                >
                  公式サイト
                </th>
                {orderedServices.map((item) => {
                  const outbound = resolveOutboundLink(
                    item.service,
                    item.affiliateLinks,
                  );
                  return (
                    <td
                      key={`cta-${item.service.id}`}
                      className="compare-service-col border-b border-[var(--border)] bg-[var(--surface)] px-[var(--compare-cell-px)] py-2 text-center align-middle"
                    >
                      {outbound ? (
                        <OfficialSiteButton
                          href={outbound.href}
                          isAffiliate={outbound.isAffiliate}
                          label="公式サイト"
                          size="sm"
                          className="!h-8 !min-h-8 !px-1 !text-[10px] sm:!h-11 sm:!min-h-11 sm:!px-2.5 sm:!text-[12px]"
                          analytics={{
                            service_name: item.service.name,
                            page_type:
                              variant === "top" ? "top" : "compare",
                            button_location: "compare_table",
                          }}
                        />
                      ) : (
                        <span className="text-[var(--text-muted)]">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </CompareHScroll>
      </div>
    </div>
  );
}

const DataRow = memo(function DataRow({
  row,
  services,
  hover,
  sortRowId,
  onSort,
  compactLabel,
}: {
  row: CompareRow;
  services: EnrichedService[];
  hover: ReturnType<typeof useCompareHover>;
  sortRowId: string | null;
  onSort: (rowId: string) => void;
  compactLabel: boolean;
}) {
  const sortable = row.kind !== "text" && row.kind !== "action";
  const active = sortable && sortRowId === row.id;
  const rowHovered = hover.hoverRow === row.id;
  return (
    <tr className="compare-data-row" id={`compare-row-${row.id}`}>
      <th
        scope="row"
        className={cn(
          "compare-label-cell compare-sticky-label border-b border-r border-[var(--border)] px-0.5 py-1.5 text-center align-middle sm:px-1.5 sm:py-2",
          sortable && "cursor-pointer hover:bg-[var(--accent-soft)]/40",
          (rowHovered || active) && "compare-cell-hover",
        )}
        onMouseEnter={() => hover.onCellEnter(row.id, "__label")}
        onMouseLeave={hover.onCellLeave}
      >
        <ComparisonMetricCell
          label={row.label}
          fieldSlug={row.fieldSlug}
          description={row.description}
          sortable={sortable}
          active={active}
          onSort={sortable ? () => onSort(row.id) : undefined}
          compactLabel={compactLabel}
        />
      </th>
      {row.cells.map((cell, i) => {
        const colId = services[i]?.service.id ?? String(i);
        const lit = hover.isHighlighted(row.id, colId);
        return (
          <td
            key={`${row.id}-${colId}`}
            className={cn(
              "compare-service-col border-b border-[var(--border)] px-[var(--compare-cell-px)] py-[var(--compare-cell-py)] text-center align-middle",
              cell.isBest || row.isHighlighted
                ? "bg-[var(--accent-soft)]"
                : "bg-white",
              lit && "compare-cell-hover",
            )}
            onMouseEnter={() => hover.onCellEnter(row.id, colId)}
            onMouseLeave={hover.onCellLeave}
            onClick={() => hover.onCellTap(row.id, colId)}
          >
            <CompareCellContent
              cell={cell}
              fieldHighlighted={row.isHighlighted}
            />
          </td>
        );
      })}
    </tr>
  );
});

function GroupBlock({
  group,
  open,
  onToggle,
  services,
  colSpan,
  hover,
  sortRowId,
  onSort,
  compactLabel,
}: {
  group: ComparisonRowGroup;
  open: boolean;
  onToggle: () => void;
  services: EnrichedService[];
  colSpan: number;
  hover: ReturnType<typeof useCompareHover>;
  sortRowId: string | null;
  onSort: (rowId: string) => void;
  compactLabel: boolean;
}) {
  return (
    <>
      <tr>
        <th
          colSpan={colSpan}
          scope="colgroup"
          className="compare-sticky-label border-b border-[var(--border)] bg-[var(--surface-navy-tint)] px-0 py-0 text-left"
        >
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition duration-150 hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/35"
            aria-expanded={open}
          >
            <ChevronDown
              size={16}
              className={cn(
                "mt-0.5 shrink-0 text-[var(--navy)] transition duration-150",
                !open && "-rotate-90",
              )}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="block text-[13px] font-bold text-[var(--navy)]">
                {group.group}
              </span>
              <span className="mt-0.5 block text-[11px] font-normal leading-snug text-[var(--text-body)]">
                {group.description}
              </span>
            </span>
          </button>
        </th>
      </tr>
      {open
        ? group.rows.map((row) => (
            <DataRow
              key={row.id}
              row={row}
              services={services}
              hover={hover}
              sortRowId={sortRowId}
              onSort={onSort}
              compactLabel={compactLabel}
            />
          ))
        : null}
    </>
  );
}

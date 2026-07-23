"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  DOMAIN_COMPARISON_GROUP_LABELS,
  DOMAIN_COMPARISON_GROUP_ORDER,
  DOMAIN_PRICE_KIND_TABS,
  findCheapestServiceIds,
  formatDomainPrice,
  formatDomainStatus,
  getDomainDetailValue,
  pickDomainCompareServices,
  visibleItemsForGroup,
  visiblePriceRowsForKind,
  type DomainCompareItemView,
  type DomainPriceKind,
} from "@/lib/site/domain-compare";
import type { DomainServiceDetails } from "@/lib/types/database";
import type { EnrichedService } from "@/lib/site/service-utils";
import type { ManagedRankingSet } from "@/lib/site/rankings-public";
import { categoryPath, resolveOutboundLink } from "@/lib/links";
import { DomainServiceLogo } from "@/components/site/domain-service-logo";
import { OfficialSiteButton } from "@/components/site/official-site-button";
import {
  SectionHeader,
  SectionShell,
  buttonClass,
  cn,
} from "@/components/site/ui";

type Props = {
  categorySlug: string;
  services: EnrichedService[];
  comparisonItems: DomainCompareItemView[];
  detailsByServiceId: Record<string, DomainServiceDetails>;
  managedRankings?: Record<string, ManagedRankingSet>;
};

const LABEL_W =
  "w-[6.5rem] min-w-[5.75rem] max-w-[6.875rem] sm:w-[7rem]";
const SERVICE_W =
  "w-[9.5rem] min-w-[8.75rem] max-w-[10rem] sm:w-[10rem]";

export function DomainTopCompareTable({
  categorySlug,
  services,
  comparisonItems,
  detailsByServiceId,
  managedRankings = {},
}: Props) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    price: true,
    feature: false,
    support: false,
  });
  const [priceKind, setPriceKind] = useState<DomainPriceKind>("registration");
  const [hoverCol, setHoverCol] = useState<string | null>(null);

  const columns = useMemo(
    () =>
      pickDomainCompareServices(
        services,
        managedRankings.overall?.items ?? [],
        5,
      ),
    [services, managedRankings],
  );

  const compareHref = categoryPath(categorySlug, "compare");

  function toggleGroup(key: string) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <SectionShell
      id="domain-compare-table"
      tone="gray"
      className="!py-[calc(var(--section-py)*0.4)] sm:!py-[calc(var(--section-py-md)*0.4)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          title="ドメインサービスを比較"
          description="取得・更新・移管料金や機能、サポートをまとめて比較できます。"
          emphasis
          className="!mb-0"
        />
        <Link
          href={compareHref}
          className="inline-flex min-h-11 shrink-0 items-center justify-center text-[13px] font-semibold text-[var(--navy)] underline-offset-2 hover:underline"
        >
          すべてのサービスを比較する
        </Link>
      </div>

      {columns.length === 0 ? (
        <p className="mt-4 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-white px-4 py-8 text-center text-sm text-[var(--text-body)]">
          比較できる公開サービスはまだありません。
        </p>
      ) : (
        <div className="domain-compare-table compare-app mt-4 sm:mt-5">
          <p className="mb-2 text-[11px] text-[var(--text-muted)] sm:hidden">
            横にスクロールして比較できます →
          </p>
          <div className="comparison-table-shell rounded-[var(--radius-card)] border border-[var(--domain-compare-border)]">
            <div className="comparison-table-scroll overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]">
              <table className="w-max min-w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className={cn(
                        "compare-header-cell compare-sticky-corner border-b border-r border-white/15 px-2 py-2.5 text-center align-middle text-[11px] font-semibold text-white/85",
                        LABEL_W,
                      )}
                    >
                      比較項目
                    </th>
                    {columns.map((col) => (
                      <th
                        key={col.service.id}
                        scope="col"
                        className={cn(
                          "compare-header-cell compare-sticky-header border-b border-white/15 px-2 py-2.5 text-center align-top",
                          SERVICE_W,
                        )}
                        onMouseEnter={() => setHoverCol(col.service.id)}
                        onMouseLeave={() => setHoverCol(null)}
                      >
                        <div className="compare-sticky-header-inner">
                          <DomainServiceLogo
                            name={col.service.name}
                            slug={col.service.slug}
                            variant="compare"
                          />
                          <p className="w-full text-center text-[12px] font-bold leading-snug text-white sm:text-[13px]">
                            <span className="jp-keep break-words">
                              {col.service.name}
                            </span>
                          </p>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {DOMAIN_COMPARISON_GROUP_ORDER.map((groupKey) => {
                    const open = openGroups[groupKey] ?? false;
                    const label = DOMAIN_COMPARISON_GROUP_LABELS[groupKey];
                    const featureRows =
                      groupKey === "feature"
                        ? visibleItemsForGroup(comparisonItems, "feature")
                        : groupKey === "support"
                          ? visibleItemsForGroup(comparisonItems, "support")
                          : [];
                    const priceRows =
                      groupKey === "price"
                        ? visiblePriceRowsForKind(comparisonItems, priceKind)
                        : [];

                    return (
                      <GroupBlock
                        key={groupKey}
                        groupKey={groupKey}
                        label={label}
                        open={open}
                        onToggle={() => toggleGroup(groupKey)}
                        colSpan={columns.length + 1}
                      >
                        {groupKey === "price" ? (
                          <>
                            <tr className="border-b border-[var(--domain-compare-border)] bg-white">
                              <td
                                colSpan={columns.length + 1}
                                className="px-2 py-2"
                              >
                                <div
                                  className="flex flex-wrap gap-1.5"
                                  role="tablist"
                                  aria-label="料金種別"
                                >
                                  {DOMAIN_PRICE_KIND_TABS.map((tab) => {
                                    const active = priceKind === tab.kind;
                                    return (
                                      <button
                                        key={tab.kind}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => setPriceKind(tab.kind)}
                                        className={cn(
                                          "inline-flex h-9 min-h-9 items-center rounded-lg px-3 text-[12px] font-medium transition",
                                          active
                                            ? "bg-[var(--navy)] text-white"
                                            : "border border-[var(--domain-compare-border)] bg-white text-[var(--text-body)] hover:border-[var(--navy)]/35",
                                        )}
                                      >
                                        {tab.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                            {priceRows.length === 0 ? (
                              <EmptyRow
                                colSpan={columns.length + 1}
                                message="表示中の料金項目がありません"
                              />
                            ) : (
                              priceRows.map((item, idx) => (
                                <PriceRow
                                  key={`${item.item_key}-${priceKind}`}
                                  item={item}
                                  columns={columns}
                                  detailsByServiceId={detailsByServiceId}
                                  stripe={idx % 2 === 1}
                                  hoverCol={hoverCol}
                                  onHoverCol={setHoverCol}
                                />
                              ))
                            )}
                          </>
                        ) : featureRows.length === 0 ? (
                          <EmptyRow
                            colSpan={columns.length + 1}
                            message="表示中の項目がありません"
                          />
                        ) : (
                          featureRows.map((item, idx) => (
                            <StatusRow
                              key={item.item_key}
                              item={item}
                              columns={columns}
                              detailsByServiceId={detailsByServiceId}
                              stripe={idx % 2 === 1}
                              hoverCol={hoverCol}
                              onHoverCol={setHoverCol}
                            />
                          ))
                        )}
                      </GroupBlock>
                    );
                  })}

                  {/* CTA: 比較の末尾（比較→判断→行動） */}
                  <tr className="border-t border-[var(--domain-compare-border)] bg-[var(--surface)]">
                    <th
                      scope="row"
                      className={cn(
                        "compare-label-cell compare-sticky-label border-b border-r border-[var(--domain-compare-border)] px-2 py-3 text-center align-middle text-[11px] font-semibold text-[var(--text-muted)] sm:py-3.5",
                        LABEL_W,
                      )}
                    >
                      公式サイト
                    </th>
                    {columns.map((col) => {
                      const outbound = resolveOutboundLink(
                        col.service,
                        col.affiliateLinks,
                      );
                      const detailHref = categoryPath(
                        categorySlug,
                        "services",
                        col.service.slug,
                      );
                      return (
                        <td
                          key={`cta-${col.service.id}`}
                          className={cn(
                            "border-b border-[var(--domain-compare-border)] px-2 py-3 text-center align-middle sm:py-3.5",
                            SERVICE_W,
                            hoverCol === col.service.id && "compare-cell-hover",
                          )}
                          onMouseEnter={() => setHoverCol(col.service.id)}
                          onMouseLeave={() => setHoverCol(null)}
                        >
                          <div className="flex w-full flex-col gap-1.5 sm:gap-2">
                            {outbound ? (
                              <OfficialSiteButton
                                href={outbound.href}
                                isAffiliate={outbound.isAffiliate}
                                label="公式サイトを見る"
                                size="md"
                                className="domain-compare-official-cta !h-12 !min-h-12 !rounded-[0.5625rem] !px-1.5 !text-[12px] !shadow-[0_3px_8px_rgba(6,106,101,0.22)] sm:!text-[13px]"
                                analytics={{
                                  service_name: col.service.name,
                                  page_type: "top",
                                  button_location: "domain_compare_table",
                                }}
                              />
                            ) : (
                              <span className="inline-flex h-12 min-h-12 items-center justify-center text-[12px] text-[var(--text-muted)]">
                                —
                              </span>
                            )}
                            <Link
                              href={detailHref}
                              className="domain-compare-detail-cta inline-flex h-10 min-h-10 w-full items-center justify-center rounded-[0.5rem] border border-[#BEEDEA] bg-white px-1.5 text-[12px] font-medium text-[#087F78] transition hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35 sm:h-[2.625rem] sm:min-h-[2.625rem]"
                            >
                              詳細を見る
                            </Link>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex justify-center sm:mt-5">
            <Link
              href={compareHref}
              className={cn(
                buttonClass("primary", "md"),
                "min-h-11 min-w-[14rem] px-5 text-[13px] font-semibold",
              )}
            >
              すべてのサービスを比較する
            </Link>
          </div>
        </div>
      )}
    </SectionShell>
  );
}

function GroupBlock({
  groupKey,
  label,
  open,
  onToggle,
  colSpan,
  children,
}: {
  groupKey: string;
  label: string;
  open: boolean;
  onToggle: () => void;
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <>
      <tr className="border-b border-[var(--domain-compare-border)]">
        <td colSpan={colSpan} className="p-0">
          <button
            type="button"
            aria-expanded={open}
            onClick={onToggle}
            className="domain-compare-accordion-btn flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[13px] font-bold text-white transition"
          >
            <span>
              {label}{" "}
              <span aria-hidden className="font-semibold">
                ▼
              </span>
            </span>
            <ChevronDown
              size={16}
              strokeWidth={2}
              className={cn(
                "shrink-0 transition-transform duration-150",
                open ? "rotate-0" : "-rotate-90",
              )}
              aria-hidden
            />
          </button>
        </td>
      </tr>
      {open ? children : null}
    </>
  );
}

function EmptyRow({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <tr className="border-b border-[var(--domain-compare-border)]">
      <td
        colSpan={colSpan}
        className="px-3 py-3 text-center text-[12px] text-[var(--text-muted)]"
      >
        {message}
      </td>
    </tr>
  );
}

function PriceRow({
  item,
  columns,
  detailsByServiceId,
  stripe,
  hoverCol,
  onHoverCol,
}: {
  item: DomainCompareItemView;
  columns: EnrichedService[];
  detailsByServiceId: Record<string, DomainServiceDetails>;
  stripe: boolean;
  hoverCol: string | null;
  onHoverCol: (id: string | null) => void;
}) {
  const valuesByServiceId: Record<string, number | null> = {};
  for (const col of columns) {
    const raw = getDomainDetailValue(
      detailsByServiceId[col.service.id],
      item.item_key,
    );
    valuesByServiceId[col.service.id] =
      typeof raw === "number" ? raw : raw == null ? null : Number(raw);
    if (
      valuesByServiceId[col.service.id] != null &&
      Number.isNaN(valuesByServiceId[col.service.id] as number)
    ) {
      valuesByServiceId[col.service.id] = null;
    }
  }

  const cheapest = item.highlight_best
    ? findCheapestServiceIds(valuesByServiceId)
    : new Set<string>();

  const rowBg = stripe ? "domain-compare-row-alt" : "bg-white";

  return (
    <tr
      className={cn(
        "domain-compare-data-row border-b border-[var(--domain-compare-border)]",
        rowBg,
      )}
    >
      <th
        scope="row"
        className={cn(
          "compare-sticky-label border-r border-[var(--domain-compare-border)] px-2 py-2.5 text-[11px] font-semibold leading-snug text-[var(--text-primary)] sm:text-[12px]",
          LABEL_W,
          stripe ? "domain-compare-label-alt" : "domain-compare-label",
        )}
      >
        <span className="jp-keep">{item.tld_label ?? item.display_name}</span>
      </th>
      {columns.map((col) => {
        const value = valuesByServiceId[col.service.id];
        const isBest = cheapest.has(col.service.id);
        return (
          <td
            key={col.service.id}
            className={cn(
              "px-2 py-2.5 text-center align-middle transition-colors",
              SERVICE_W,
              isBest && "domain-compare-best-cell",
              hoverCol === col.service.id && !isBest && "compare-cell-hover",
            )}
            onMouseEnter={() => onHoverCol(col.service.id)}
            onMouseLeave={() => onHoverCol(null)}
          >
            <span
              className={cn(
                "inline-flex flex-wrap items-center justify-center gap-1 text-[13px] tabular-nums text-[var(--text-primary)] sm:text-[14px]",
                isBest && "font-extrabold text-[var(--navy)]",
                value == null && "text-[var(--text-muted)]",
              )}
            >
              {formatDomainPrice(value)}
              {isBest ? (
                <span className="domain-compare-best-badge">最安</span>
              ) : null}
            </span>
          </td>
        );
      })}
    </tr>
  );
}

function StatusRow({
  item,
  columns,
  detailsByServiceId,
  stripe,
  hoverCol,
  onHoverCol,
}: {
  item: DomainCompareItemView;
  columns: EnrichedService[];
  detailsByServiceId: Record<string, DomainServiceDetails>;
  stripe: boolean;
  hoverCol: string | null;
  onHoverCol: (id: string | null) => void;
}) {
  const rowBg = stripe ? "domain-compare-row-alt" : "bg-white";

  return (
    <tr
      className={cn(
        "domain-compare-data-row border-b border-[var(--domain-compare-border)]",
        rowBg,
      )}
    >
      <th
        scope="row"
        className={cn(
          "compare-sticky-label border-r border-[var(--domain-compare-border)] px-2 py-2.5 text-[11px] font-semibold leading-snug text-[var(--text-primary)] sm:text-[12px]",
          LABEL_W,
          stripe ? "domain-compare-label-alt" : "domain-compare-label",
        )}
      >
        <span className="jp-keep">{item.display_name}</span>
      </th>
      {columns.map((col) => {
        const raw = getDomainDetailValue(
          detailsByServiceId[col.service.id],
          item.item_key,
        );
        const formatted = formatDomainStatus(
          typeof raw === "string" ? raw : null,
        );
        return (
          <td
            key={col.service.id}
            className={cn(
              "px-2 py-2.5 text-center align-middle transition-colors",
              SERVICE_W,
              hoverCol === col.service.id && "compare-cell-hover",
            )}
            onMouseEnter={() => onHoverCol(col.service.id)}
            onMouseLeave={() => onHoverCol(null)}
          >
            <span
              className={cn(
                "text-[15px] font-semibold leading-none",
                formatted.tone === "ok" && "text-[var(--navy)]",
                formatted.tone === "ng" && "text-[var(--text-muted)]",
                formatted.tone === "partial" && "text-amber-600",
                formatted.tone === "empty" && "text-[var(--text-muted)]",
              )}
              aria-label={
                formatted.tone === "ok"
                  ? "対応"
                  : formatted.tone === "ng"
                    ? "非対応"
                    : formatted.tone === "partial"
                      ? "条件付き"
                      : "未登録"
              }
            >
              {formatted.text}
            </span>
          </td>
        );
      })}
    </tr>
  );
}

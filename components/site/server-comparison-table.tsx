"use client";

import Link from "next/link";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Check,
  ChevronDown,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ComparisonField } from "@/lib/types/database";
import {
  formatComparisonDisplay,
  formatPrice,
  formatStorage,
  hasComparisonValue,
} from "@/lib/types/comparison";
import { categoryPath } from "@/lib/links";
import { COMPARISON_FILTERS } from "@/lib/site/content";
import {
  filterServicesByPurpose,
  pickComparisonColumns,
  type EnrichedService,
} from "@/lib/site/service-utils";
import { ServiceLogo } from "@/components/site/service-logo";
import { AddToCompareButton } from "@/components/site/compare/add-to-compare-button";
import { PlanSwitcher } from "@/components/site/compare/plan-switcher";
import { usePlanSelection } from "@/components/site/compare/use-plan-selection";
import {
  Badge,
  buttonClass,
  cn,
  ICON_SM,
  SiteLinkButton,
} from "@/components/site/ui";

type Props = {
  categorySlug: string;
  services: EnrichedService[];
  fields: ComparisonField[];
  allCount: number;
};

type SortKey = "default" | "price-asc" | "price-desc" | "name";

function numericPrice(item: EnrichedService): number | null {
  const plan = item.representativePlan;
  if (!plan) return null;
  return (
    plan.effective_monthly_price ??
    plan.campaign_monthly_price ??
    plan.regular_monthly_price
  );
}

function planPrice(item: EnrichedService): string {
  const price = numericPrice(item);
  if (price == null) return "—";
  return formatPrice(price);
}

function planStorage(item: EnrichedService): string {
  const plan = item.representativePlan;
  if (!plan || plan.storage_value == null) return "—";
  return formatStorage(plan.storage_value, plan.storage_unit);
}

function planInitialFee(item: EnrichedService): string {
  const fee = item.representativePlan?.initial_fee;
  if (fee == null) return "—";
  return formatPrice(fee);
}

function findColumn(
  columns: ComparisonField[],
  patterns: RegExp[],
): ComparisonField | undefined {
  return columns.find(
    (c) =>
      patterns.some((p) => p.test(c.slug)) ||
      patterns.some((p) => p.test(c.name)),
  );
}

function CellValue({
  field,
  value,
}: {
  field: ComparisonField;
  value: EnrichedService["comparisonByFieldId"][string] | null;
}) {
  if (!hasComparisonValue(field, value)) {
    return <span className="text-slate-300">—</span>;
  }
  if (field.field_type === "boolean") {
    if (value?.boolean_value === true) {
      return (
        <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
          <Check size={ICON_SM} strokeWidth={2.5} aria-hidden />
          ○
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-slate-400">
        <X size={ICON_SM} aria-hidden />
        ×
      </span>
    );
  }
  const text = formatComparisonDisplay(field, value ?? null);
  if (text === "—" || text === "○") {
    return text === "○" ? (
      <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
        <Check size={ICON_SM} strokeWidth={2.5} aria-hidden />○
      </span>
    ) : (
      <span className="text-slate-300">—</span>
    );
  }
  return <span>{text}</span>;
}

export function ServerComparisonTable({
  categorySlug,
  services,
  fields,
  allCount,
}: Props) {
  const [filterId, setFilterId] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { selectedPlanIds, setPlan, resolvedServices } =
    usePlanSelection(services);
  const columns = useMemo(() => pickComparisonColumns(fields), [fields]);

  const sslCol = useMemo(
    () => findColumn(columns, [/ssl/i, /無料SSL/]),
    [columns],
  );
  const backupCol = useMemo(
    () => findColumn(columns, [/backup/i, /バックアップ/]),
    [columns],
  );
  const supportCol = useMemo(
    () => findColumn(columns, [/support/i, /サポート/]),
    [columns],
  );

  const primaryMobileCols = useMemo(() => {
    const list: ComparisonField[] = [];
    if (backupCol) list.push(backupCol);
    return list;
  }, [backupCol]);

  const extraMobileCols = useMemo(() => {
    const primaryIds = new Set(primaryMobileCols.map((c) => c.id));
    return columns.filter((c) => !primaryIds.has(c.id));
  }, [columns, primaryMobileCols]);

  const filtered = useMemo(() => {
    let list = resolvedServices;
    if (filterId !== "all") {
      const purpose = COMPARISON_FILTERS.find((f) => f.id === filterId);
      if (purpose && "purposeId" in purpose && purpose.purposeId) {
        list = filterServicesByPurpose(resolvedServices, purpose.purposeId);
      }
    }
    const sorted = [...list];
    if (sortKey === "name") {
      sorted.sort((a, b) =>
        a.service.name.localeCompare(b.service.name, "ja"),
      );
    } else if (sortKey === "price-asc" || sortKey === "price-desc") {
      sorted.sort((a, b) => {
        const pa = numericPrice(a);
        const pb = numericPrice(b);
        if (pa == null && pb == null) return 0;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return sortKey === "price-asc" ? pa - pb : pb - pa;
      });
    }
    return sorted;
  }, [filterId, resolvedServices, sortKey]);

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {COMPARISON_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterId(f.id)}
              className={cn(
                "h-8 rounded-md px-2.5 text-[12px] font-medium transition",
                filterId === f.id
                  ? "bg-[var(--navy)] text-white"
                  : "bg-white text-[var(--text-body)] ring-1 ring-[var(--border)] hover:bg-[var(--surface)]",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-[var(--text-muted)]">
            並び替え
          </span>
          <SortChip
            active={sortKey === "default"}
            onClick={() => setSortKey("default")}
            label="掲載順"
          />
          <SortChip
            active={sortKey === "price-asc"}
            onClick={() => setSortKey("price-asc")}
            label="料金が安い"
            icon={<ArrowUpNarrowWide size={12} aria-hidden />}
          />
          <SortChip
            active={sortKey === "price-desc"}
            onClick={() => setSortKey("price-desc")}
            label="料金が高い"
            icon={<ArrowDownWideNarrow size={12} aria-hidden />}
          />
          <SortChip
            active={sortKey === "name"}
            onClick={() => setSortKey("name")}
            label="名前"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-5 border border-dashed border-[var(--border)] bg-white px-4 py-8 text-center text-sm text-[var(--text-body)]">
          この条件に一致するサービスはまだありません。
        </p>
      ) : (
        <>
          {/* PC table */}
          <div className="mt-4 hidden overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-white md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[11px] text-[var(--text-muted)]">
                    <th className="sticky left-0 z-20 bg-white px-3 py-2 font-medium shadow-[4px_0_8px_-6px_rgba(15,23,42,0.08)]">
                      サービス
                    </th>
                    <th className="px-3 py-2 font-medium">プラン</th>
                    <th className="px-3 py-2 font-medium">月額料金</th>
                    <th className="px-3 py-2 font-medium">契約期間</th>
                    <th className="px-3 py-2 font-medium">初期費用</th>
                    <th className="px-3 py-2 font-medium">容量</th>
                    {columns.map((col) => (
                      <th
                        key={col.id}
                        className={cn(
                          "px-3 py-2 font-medium",
                          (col.id === backupCol?.id ||
                            col.id === supportCol?.id ||
                            col.id === sslCol?.id) &&
                            "text-[var(--text-body)]",
                        )}
                      >
                        {col.name}
                      </th>
                    ))}
                    <th className="sticky right-0 z-20 bg-white px-3 py-2 text-right font-medium shadow-[-4px_0_8px_-6px_rgba(15,23,42,0.08)]">
                      比較
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const s = item.service;
                    const detailHref = categoryPath(
                      categorySlug,
                      "services",
                      s.slug,
                    );
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-[var(--surface)]/70"
                      >
                        <td className="sticky left-0 z-10 bg-white px-3 py-2 shadow-[4px_0_8px_-6px_rgba(15,23,42,0.06)]">
                          <Link
                            href={detailHref}
                            className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)] hover:text-[var(--brand)]"
                          >
                            <ServiceLogo
                              name={s.name}
                              logoUrl={s.logo_url}
                              size="sm"
                              fallback="none"
                            />
                            <span className="min-w-0">
                              <span className="block jp-keep">{s.name}</span>
                              {s.is_featured ? (
                                <Badge
                                  tone="amber"
                                  className="mt-0.5 h-4 text-[9px]"
                                >
                                  注目
                                </Badge>
                              ) : null}
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-[var(--text-body)]">
                          <PlanSwitcher
                            plans={item.plans ?? []}
                            selectedPlanId={
                              selectedPlanIds[s.id] ??
                              item.representativePlan?.id ??
                              null
                            }
                            onChange={(planId) => setPlan(s.id, planId)}
                            tone="light"
                            className="max-w-[10rem]"
                          />
                          {(item.plans?.length ?? 0) === 0 ? "—" : null}
                        </td>
                        <td className="px-3 py-2 text-[15px] font-bold tabular-nums text-[var(--text-primary)]">
                          {planPrice(item)}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-body)]">
                          {item.representativePlan?.billing_period?.trim() ||
                            "—"}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-[var(--text-body)]">
                          {planInitialFee(item)}
                        </td>
                        <td className="px-3 py-2 font-medium tabular-nums text-[var(--text-primary)]">
                          {planStorage(item)}
                        </td>
                        {columns.map((col) => (
                          <td key={col.id} className="px-3 py-2">
                            <CellValue
                              field={col}
                              value={item.comparisonByFieldId[col.id] ?? null}
                            />
                          </td>
                        ))}
                        <td className="sticky right-0 z-10 bg-white px-3 py-2 text-right shadow-[-4px_0_8px_-6px_rgba(15,23,42,0.06)]">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={detailHref}
                              className={buttonClass("ghost", "sm")}
                            >
                              特徴・料金を見る
                            </Link>
                            <AddToCompareButton
                              slug={s.slug}
                              name={s.name}
                              categorySlug={categorySlug}
                              size="sm"
                              emphasis="primary"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: compact vertical rows */}
          <div className="mt-4 space-y-2 md:hidden">
            {filtered.map((item) => {
              const s = item.service;
              const detailHref = categoryPath(
                categorySlug,
                "services",
                s.slug,
              );
              const isOpen = Boolean(expanded[s.id]);
              return (
                <article
                  key={s.id}
                  className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-3 py-2.5"
                >
                  <div className="flex items-start gap-2.5">
                    <ServiceLogo
                      name={s.name}
                      logoUrl={s.logo_url}
                      size="sm"
                      fallback="none"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={detailHref}
                          className="text-[13px] font-semibold text-[var(--text-primary)] hover:text-[var(--brand)] jp-keep"
                        >
                          {s.name}
                        </Link>
                        <p className="shrink-0 text-[15px] font-bold tabular-nums text-[var(--text-primary)]">
                          {planPrice(item)}
                        </p>
                      </div>
                      <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-[var(--text-body)]">
                        <div className="w-full">
                          <PlanSwitcher
                            plans={item.plans ?? []}
                            selectedPlanId={
                              selectedPlanIds[s.id] ??
                              item.representativePlan?.id ??
                              null
                            }
                            onChange={(planId) => setPlan(s.id, planId)}
                            tone="light"
                            className="max-w-full"
                          />
                        </div>
                        <div className="flex gap-1">
                          <dt className="text-[var(--text-muted)]">容量</dt>
                          <dd className="font-medium text-[var(--text-primary)]">
                            {planStorage(item)}
                          </dd>
                        </div>
                        {primaryMobileCols.map((col) => (
                          <div key={col.id} className="flex items-center gap-1">
                            <dt className="text-[var(--text-muted)]">
                              {col.name}
                            </dt>
                            <dd>
                              <CellValue
                                field={col}
                                value={
                                  item.comparisonByFieldId[col.id] ?? null
                                }
                              />
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>

                  {isOpen ? (
                    <dl className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[12px]">
                      <MobileSpec
                        label="初期費用"
                        value={planInitialFee(item)}
                      />
                      {sslCol ? (
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-[var(--text-muted)]">
                            {sslCol.name}
                          </dt>
                          <dd>
                            <CellValue
                              field={sslCol}
                              value={
                                item.comparisonByFieldId[sslCol.id] ?? null
                              }
                            />
                          </dd>
                        </div>
                      ) : null}
                      {extraMobileCols
                        .filter((c) => c.id !== sslCol?.id)
                        .map((col) => (
                          <div
                            key={col.id}
                            className="flex items-center justify-between gap-3"
                          >
                            <dt className="text-[var(--text-muted)]">
                              {col.name}
                            </dt>
                            <dd>
                              <CellValue
                                field={col}
                                value={
                                  item.comparisonByFieldId[col.id] ?? null
                                }
                              />
                            </dd>
                          </div>
                        ))}
                    </dl>
                  ) : null}

                  <div className="mt-2 flex items-center gap-2">
                    <AddToCompareButton
                      slug={s.slug}
                      name={s.name}
                      categorySlug={categorySlug}
                      size="sm"
                      emphasis="primary"
                      className="flex-1"
                    />
                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-0.5 px-1.5 text-[11px] font-medium text-[var(--text-muted)]"
                      onClick={() =>
                        setExpanded((prev) => ({
                          ...prev,
                          [s.id]: !prev[s.id],
                        }))
                      }
                    >
                      {isOpen ? "閉じる" : "特徴を見る"}
                      <ChevronDown
                        size={12}
                        className={cn("transition", isOpen && "rotate-180")}
                        aria-hidden
                      />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-6 text-center">
        <SiteLinkButton
          href={categoryPath(categorySlug, "services")}
          variant="secondary"
          size="md"
        >
          {allCount > 0 ? `${allCount}社すべてを見る` : "サービス一覧を見る"}
        </SiteLinkButton>
      </div>
    </div>
  );
}

function SortChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition",
        active
          ? "bg-[var(--navy)] text-white"
          : "bg-white text-[var(--text-body)] ring-1 ring-[var(--border)] hover:bg-[var(--surface)]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function MobileSpec({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="tabular-nums text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}

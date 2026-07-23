"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { ComparisonField } from "@/lib/types/database";
import { categoryPath } from "@/lib/links";
import { resolveComparePageFields } from "@/lib/site/comparison-display";
import type { EnrichedService } from "@/lib/site/service-utils";
import { useCompare } from "@/components/site/compare/compare-context";
import {
  ComparisonTable,
} from "@/components/site/compare/comparison-table";
import {
  useComparePins,
} from "@/components/site/compare/compare-pins";
import { CompareTableNote } from "@/components/site/compare/compare-table-note";
import { buttonClass, cn } from "@/components/site/ui";

type ServiceOption = { slug: string; name: string };

type Props = {
  categorySlug: string;
  allServices: ServiceOption[];
  enriched: EnrichedService[];
  fields: ComparisonField[];
  /** URL ?slugs= 由来（最優先） */
  initialSlugs: string[];
  /** TOP徹底比較と同じデフォルト slug */
  defaultSlugs?: string[];
};

function slugsToItems(
  slugs: string[],
  allServices: ServiceOption[],
  categorySlug: string,
) {
  return slugs
    .map((slug) => {
      const found = allServices.find((s) => s.slug === slug);
      if (!found) return null;
      return {
        slug: found.slug,
        name: found.name,
        categorySlug,
      };
    })
    .filter(
      (i): i is { slug: string; name: string; categorySlug: string } =>
        Boolean(i),
    );
}

/**
 * 比較ページ: サービス選択 UI ＋ 共通 ComparisonTable。
 * 選択 state は CompareProvider（PC/スマホ共通）のみを参照する。
 */
export function ComparePageClient({
  categorySlug,
  allServices,
  enriched,
  fields,
  initialSlugs,
  defaultSlugs = [],
}: Props) {
  const {
    items,
    add,
    remove,
    clear,
    replace,
    hasEmptyIntent,
    max,
  } = useCompare();
  const serviceMax = Math.min(max, allServices.length || max);

  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(true);
  const seededKeyRef = useRef<string | null>(null);
  const seedReadyRef = useRef(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const validSlugSet = useMemo(
    () => new Set(allServices.map((s) => s.slug)),
    [allServices],
  );
  const { pinnedSlugs, unpinMany, clearPins } = useComparePins(validSlugSet);

  const initialKey = initialSlugs.join(",");

  /**
   * 優先順位:
   * 1. URL slugs（props または location.search）
   * 2. 保存済み選択
   * 3. TOP徹底比較デフォルト（empty intent でないときのみ）
   *
   * URL 同期 effect より先に完了させ、空 selected で ?slugs= を消さない。
   */
  useLayoutEffect(() => {
    const fromLocation =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("slugs")
        : null;
    const locationSlugs = (fromLocation ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const urlSlugs =
      initialSlugs.length > 0 ? initialSlugs : locationSlugs;

    if (urlSlugs.length > 0) {
      const key = `url:${urlSlugs.join(",")}`;
      if (seededKeyRef.current !== key) {
        seededKeyRef.current = key;
        replace(slugsToItems(urlSlugs, allServices, categorySlug));
      }
      seedReadyRef.current = true;
      return;
    }

    if (!seededKeyRef.current) {
      seededKeyRef.current = "local";
      const existing = items.filter((i) => i.categorySlug === categorySlug);
      if (existing.length === 0 && !hasEmptyIntent() && defaultSlugs.length > 0) {
        replace(slugsToItems(defaultSlugs, allServices, categorySlug));
      }
    }
    seedReadyRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed controlled by initialKey / once
  }, [initialKey]);

  const selected = useMemo(() => {
    return items
      .filter((i) => i.categorySlug === categorySlug)
      .map((i) => i.slug)
      .slice(0, serviceMax);
  }, [items, categorySlug, serviceMax]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const panelOpen = selected.length === 0 || pickerOpen;

  // router.replace は RSC 再マウントで選択と競合するため history のみ同期
  const selectedKey = selected.join(",");
  useEffect(() => {
    if (!seedReadyRef.current) return;
    if (typeof window === "undefined") return;
    // シード前の空 selected で URL の ?slugs= を消さない
    const hasUrlSlugs = new URLSearchParams(window.location.search).has("slugs");
    if (!selectedKey && hasUrlSlugs) return;
    const path = categoryPath(categorySlug, "compare");
    const next = selectedKey ? `${path}?slugs=${selectedKey}` : path;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== next) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [selectedKey, categorySlug]);

  const nameBySlug = useMemo(
    () => new Map(allServices.map((s) => [s.slug, s.name])),
    [allServices],
  );

  // 比較対象から外れたピンは解除（hydration 直後の selected=[] では消さない）
  useEffect(() => {
    if (!seededKeyRef.current) return;
    if (selected.length === 0 && !hasEmptyIntent()) return;
    const orphan = pinnedSlugs.filter((slug) => !selectedSet.has(slug));
    if (orphan.length > 0) unpinMany(orphan);
  }, [selected.length, selectedSet, pinnedSlugs, unpinMany, hasEmptyIntent]);

  const selectedServices = useMemo(() => {
    const map = new Map(enriched.map((e) => [e.service.slug, e]));
    return selected
      .map((slug) => map.get(slug))
      .filter((s): s is EnrichedService => Boolean(s));
  }, [enriched, selected]);

  const visibleFields = useMemo(
    () => resolveComparePageFields(fields),
    [fields],
  );

  function toggle(slug: string) {
    const name = nameBySlug.get(slug) ?? slug;
    if (selectedSet.has(slug)) {
      remove(slug);
      return;
    }
    if (selected.length >= serviceMax) return;
    add({ slug, name, categorySlug });
  }

  function applyDefaults() {
    if (defaultSlugs.length === 0) return;
    seededKeyRef.current = "defaults";
    replace(slugsToItems(defaultSlugs, allServices, categorySlug));
    setPickerOpen(true);
  }

  function handleClear() {
    clear();
    clearPins();
    seededKeyRef.current = "cleared";
    setPickerOpen(true);
  }

  function scrollToTable() {
    const el =
      tableRef.current ?? document.getElementById("compare-page-table");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allServices;
    return allServices.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q),
    );
  }, [allServices, query]);

  const showTable = selected.length > 0 && visibleFields.length > 0;
  const showNoFields = selected.length > 0 && visibleFields.length === 0;

  return (
    <>
      <div className="mt-2.5 rounded-[var(--radius-card)] border border-[var(--border)] bg-white shadow-[var(--shadow-card)] sm:mt-3">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition duration-150 sm:px-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35"
          aria-expanded={panelOpen}
          aria-controls="compare-picker-panel"
        >
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--text-primary)] sm:text-sm">
              比較対象（{selected.length} / {allServices.length}）
            </p>
            {selected.length > 0 ? (
              <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)] sm:text-[12px]">
                {selected.map((s) => nameBySlug.get(s) ?? s).join(" · ")}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)] sm:text-[12px]">
                比較したいサービスを選んでください
              </p>
            )}
          </div>
          <span className="inline-flex items-center gap-2">
            {selected.length > 0 ? (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClear();
                  }
                }}
                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                全解除
              </span>
            ) : null}
            <ChevronDown
              size={16}
              className={cn(
                "shrink-0 text-[var(--text-muted)] transition duration-150",
                panelOpen && "rotate-180",
              )}
              aria-hidden
            />
          </span>
        </button>

        {panelOpen ? (
          <div
            id="compare-picker-panel"
            className="border-t border-[var(--border)] px-3 pb-3 pt-2 sm:px-3.5"
          >
            <label className="relative block">
              <span className="sr-only">サービスを検索</span>
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="サービスを検索"
                className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-8 pr-8 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/15"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="検索をクリア"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X size={14} aria-hidden />
                </button>
              ) : null}
            </label>

            <div
              className="mt-2 max-h-[9.5rem] space-y-0.5 overflow-y-auto sm:max-h-[11rem]"
              role="listbox"
              aria-label="比較するサービス"
              aria-multiselectable
            >
              {filteredOptions.map((s) => {
                const on = selectedSet.has(s.slug);
                const disabled = !on && selected.length >= serviceMax;
                return (
                  <button
                    key={s.slug}
                    type="button"
                    role="option"
                    aria-selected={on}
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      toggle(s.slug);
                    }}
                    className={cn(
                      "flex w-full cursor-pointer touch-manipulation items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] transition duration-150",
                      on
                        ? "bg-[var(--accent-soft)] text-[var(--navy)]"
                        : "hover:bg-[var(--surface)]",
                      disabled && "cursor-not-allowed opacity-45",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition duration-150",
                        on
                          ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                          : "border-[var(--border)] bg-white",
                      )}
                      aria-hidden
                    >
                      {on ? <Check size={12} strokeWidth={3} /> : null}
                    </span>
                    <span className="truncate font-medium jp-keep">{s.name}</span>
                  </button>
                );
              })}
              {filteredOptions.length === 0 ? (
                <p className="px-2 py-3 text-center text-[12px] text-[var(--text-muted)]">
                  該当するサービスがありません
                </p>
              ) : null}
            </div>

            {selected.length === 0 && defaultSlugs.length > 0 ? (
              <button
                type="button"
                onClick={applyDefaults}
                className={cn(buttonClass("secondary", "sm"), "mt-2 w-full")}
              >
                おすすめサービスを選択
              </button>
            ) : null}

            {selected.length >= 2 ? (
              <button
                type="button"
                onClick={scrollToTable}
                className={cn(
                  buttonClass("primary", "sm"),
                  "mt-2 w-full sm:hidden",
                )}
              >
                比較表を見る
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {selected.length === 0 ? (
        <div className="mt-3 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center sm:mt-4 sm:py-8">
          <p className="text-[13px] text-[var(--text-body)] text-pretty">
            比較するサービスを選択してください
          </p>
          {defaultSlugs.length > 0 ? (
            <button
              type="button"
              onClick={applyDefaults}
              className={cn(buttonClass("primary", "md"), "mt-3 sm:mt-4")}
            >
              おすすめサービスを選択
            </button>
          ) : null}
        </div>
      ) : null}

      {showNoFields ? (
        <div className="mt-3 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center sm:mt-4 sm:py-8">
          <p className="text-[13px] text-[var(--text-body)] text-pretty">
            現在、表示可能な比較項目がありません。
          </p>
        </div>
      ) : null}

      {showTable ? (
        <div ref={tableRef} className="mt-3 scroll-mt-24 sm:mt-4">
          <CompareTableNote className="mb-2.5" />
          <ComparisonTable
            categorySlug={categorySlug}
            services={selectedServices}
            fields={fields}
            variant="compare"
            enablePins
            showGroups={false}
            denseMobile
            compactLabel
            showMobileTips
            tableId="compare-page-table"
          />
        </div>
      ) : null}
    </>
  );
}

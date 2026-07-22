"use client";

import { useMemo, useState, useTransition } from "react";
import { saveComparisonDisplayAction } from "@/lib/actions/comparison-display";
import type { CompareRule, ComparisonField } from "@/lib/types/database";
import {
  TOP_FEATURED_FIELD_COUNT,
  TOP_TABLE_FIELD_MAX,
} from "@/lib/site/comparison-display";

type RowState = {
  id: string;
  name: string;
  slug: string;
  display_group: string | null;
  show_in_top_featured: boolean;
  top_featured_display_order: number | null;
  show_in_top_table: boolean;
  top_table_display_order: number | null;
  show_in_compare_page: boolean;
  compare_page_display_order: number | null;
  compare_rule: CompareRule | null;
};

type Props = {
  categoryId: string;
  categoryName: string;
  fields: ComparisonField[];
};

function toRows(fields: ComparisonField[]): RowState[] {
  return fields.map((f) => ({
    id: f.id,
    name: f.name,
    slug: f.slug,
    display_group: f.display_group,
    show_in_top_featured: Boolean(f.show_in_top_featured),
    top_featured_display_order: f.top_featured_display_order ?? null,
    show_in_top_table: Boolean(f.show_in_top_table),
    top_table_display_order: f.top_table_display_order ?? null,
    show_in_compare_page: f.show_in_compare_page !== false,
    compare_page_display_order: f.compare_page_display_order ?? null,
    compare_rule: f.compare_rule ?? null,
  }));
}

export function ComparisonDisplayPanel({
  categoryId,
  categoryName,
  fields,
}: Props) {
  const [rows, setRows] = useState(() => toRows(fields));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const featuredCount = rows.filter((r) => r.show_in_top_featured).length;
  const tableCount = rows.filter((r) => r.show_in_top_table).length;

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) =>
        a.name.localeCompare(b.name, "ja"),
      ),
    [rows],
  );

  function updateRow(id: string, patch: Partial<RowState>) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }

  function toggleFeatured(id: string, checked: boolean) {
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          show_in_top_featured: checked,
          top_featured_display_order: checked
            ? r.top_featured_display_order ??
              prev.filter((x) => x.show_in_top_featured).length + 1
            : null,
        };
      });
      return renumber(next, "featured");
    });
  }

  function toggleTable(id: string, checked: boolean) {
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          show_in_top_table: checked,
          top_table_display_order: checked
            ? r.top_table_display_order ??
              prev.filter((x) => x.show_in_top_table).length + 1
            : null,
        };
      });
      return renumber(next, "table");
    });
  }

  function handleSave() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("category_id", categoryId);
      fd.set(
        "placements_json",
        JSON.stringify(
          rows.map((r) => ({
            id: r.id,
            show_in_top_featured: r.show_in_top_featured,
            top_featured_display_order: r.top_featured_display_order,
            show_in_top_table: r.show_in_top_table,
            top_table_display_order: r.top_table_display_order,
            show_in_compare_page: r.show_in_compare_page,
            compare_page_display_order: r.compare_page_display_order,
            compare_rule: r.compare_rule,
          })),
        ),
      );
      const result = await saveComparisonDisplayAction(fd);
      if (result.ok) setMessage(result.message);
      else setError(result.message);
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">比較項目の表示</h2>
          <p className="mt-1 text-sm text-slate-600">
            {categoryName} — TOP人気3社は必ず{TOP_FEATURED_FIELD_COUNT}
            件、TOP比較表は最大{TOP_TABLE_FIELD_MAX}件
          </p>
          <p className="mt-1 text-xs text-slate-500">
            選択中: 人気3社 {featuredCount}/{TOP_FEATURED_FIELD_COUNT} ・ 比較表{" "}
            {tableCount}/{TOP_TABLE_FIELD_MAX}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "保存中…" : "表示設定を保存"}
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      {/* Mobile cards */}
      <div className="mt-4 space-y-3 md:hidden">
        {sorted.map((row) => (
          <article
            key={row.id}
            className="rounded-xl border border-slate-200 p-3"
          >
            <p className="font-semibold text-slate-900">{row.name}</p>
            <p className="text-xs text-slate-500">
              {row.slug}
              {row.display_group ? ` / ${row.display_group}` : ""}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={row.show_in_top_featured}
                  onChange={(e) => toggleFeatured(row.id, e.target.checked)}
                />
                TOP 人気3社
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={row.show_in_top_table}
                  onChange={(e) => toggleTable(row.id, e.target.checked)}
                />
                TOP 比較表
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={row.show_in_compare_page}
                  onChange={(e) =>
                    updateRow(row.id, {
                      show_in_compare_page: e.target.checked,
                    })
                  }
                />
                比較ページ
              </label>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <OrderInput
                label="人気3社順"
                value={row.top_featured_display_order}
                disabled={!row.show_in_top_featured}
                onChange={(n) =>
                  updateRow(row.id, { top_featured_display_order: n })
                }
              />
              <OrderInput
                label="比較表順"
                value={row.top_table_display_order}
                disabled={!row.show_in_top_table}
                onChange={(n) =>
                  updateRow(row.id, { top_table_display_order: n })
                }
              />
              <OrderInput
                label="比較頁順"
                value={row.compare_page_display_order}
                disabled={!row.show_in_compare_page}
                onChange={(n) =>
                  updateRow(row.id, { compare_page_display_order: n })
                }
              />
            </div>
          </article>
        ))}
      </div>

      {/* Desktop table */}
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">表示名</th>
              <th className="px-3 py-2 font-medium">項目キー</th>
              <th className="px-3 py-2 font-medium">カテゴリ</th>
              <th className="px-3 py-2 font-medium">TOP 人気3社</th>
              <th className="px-3 py-2 font-medium">TOP 比較表</th>
              <th className="px-3 py-2 font-medium">比較ページ</th>
              <th className="px-3 py-2 font-medium">表示順</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-2 font-medium text-slate-900">
                  {row.name}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-slate-600">
                  {row.slug}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {row.display_group || "—"}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={row.show_in_top_featured}
                    onChange={(e) => toggleFeatured(row.id, e.target.checked)}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={row.show_in_top_table}
                    onChange={(e) => toggleTable(row.id, e.target.checked)}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={row.show_in_compare_page}
                    onChange={(e) =>
                      updateRow(row.id, {
                        show_in_compare_page: e.target.checked,
                      })
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <OrderInput
                      label="3社"
                      compact
                      value={row.top_featured_display_order}
                      disabled={!row.show_in_top_featured}
                      onChange={(n) =>
                        updateRow(row.id, { top_featured_display_order: n })
                      }
                    />
                    <OrderInput
                      label="表"
                      compact
                      value={row.top_table_display_order}
                      disabled={!row.show_in_top_table}
                      onChange={(n) =>
                        updateRow(row.id, { top_table_display_order: n })
                      }
                    />
                    <OrderInput
                      label="頁"
                      compact
                      value={row.compare_page_display_order}
                      disabled={!row.show_in_compare_page}
                      onChange={(n) =>
                        updateRow(row.id, { compare_page_display_order: n })
                      }
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OrderInput({
  label,
  value,
  disabled,
  onChange,
  compact,
}: {
  label: string;
  value: number | null;
  disabled?: boolean;
  onChange: (n: number | null) => void;
  compact?: boolean;
}) {
  return (
    <label className={compact ? "block w-14" : "block"}>
      <span className="text-[10px] text-slate-400">{label}</span>
      <input
        type="number"
        min={1}
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : Number(v));
        }}
        className="mt-0.5 h-8 w-full rounded border border-slate-300 px-1.5 text-xs disabled:bg-slate-50"
      />
    </label>
  );
}

function renumber(
  rows: RowState[],
  kind: "featured" | "table",
): RowState[] {
  const key =
    kind === "featured" ? "show_in_top_featured" : "show_in_top_table";
  const orderKey =
    kind === "featured"
      ? "top_featured_display_order"
      : "top_table_display_order";
  const selected = rows
    .filter((r) => r[key])
    .sort((a, b) => (a[orderKey] ?? 999) - (b[orderKey] ?? 999));
  const orderMap = new Map(
    selected.map((r, i) => [r.id, i + 1] as const),
  );
  return rows.map((r) =>
    r[key]
      ? { ...r, [orderKey]: orderMap.get(r.id) ?? r[orderKey] }
      : { ...r, [orderKey]: null },
  );
}

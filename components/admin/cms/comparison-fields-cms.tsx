"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveComparisonLayoutDraftAction } from "@/lib/actions/cms";
import type { ComparisonField } from "@/lib/types/database";
import { FIELD_TYPE_LABELS, groupFieldsByDisplayGroup } from "@/lib/types/comparison";
import { StatusBadge, type CmsBadgeStatus } from "@/components/admin/cms/status-badge";

type Props = {
  fields: ComparisonField[];
};

type OrderKey =
  | "top_featured_display_order"
  | "top_table_display_order"
  | "compare_page_display_order";

type RowState = {
  id: string;
  show_in_top_featured: boolean;
  show_in_top_table: boolean;
  show_in_compare_page: boolean;
  top_featured_display_order: number | null;
  top_table_display_order: number | null;
  compare_page_display_order: number | null;
};

function initialRow(field: ComparisonField): RowState {
  return {
    id: field.id,
    show_in_top_featured: field.draft_show_in_top_featured ?? field.show_in_top_featured ?? false,
    show_in_top_table: field.draft_show_in_top_table ?? field.show_in_top_table ?? false,
    show_in_compare_page:
      field.draft_show_in_compare_page ?? field.show_in_compare_page ?? false,
    top_featured_display_order: field.top_featured_display_order ?? null,
    top_table_display_order: field.top_table_display_order ?? null,
    compare_page_display_order: field.compare_page_display_order ?? null,
  };
}

/** 指定した表示順キーで隣接する項目と表示順を入れ替える（未設定は末尾扱い） */
function moveOrder(
  rows: RowState[],
  id: string,
  orderKey: OrderKey,
  direction: "up" | "down",
): RowState[] {
  const sorted = [...rows].sort((a, b) => {
    const av = a[orderKey] ?? Number.MAX_SAFE_INTEGER;
    const bv = b[orderKey] ?? Number.MAX_SAFE_INTEGER;
    return av - bv;
  });
  const idx = sorted.findIndex((r) => r.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return rows;
  const a = sorted[idx];
  const b = sorted[swapIdx];
  const aOrder = a[orderKey] ?? idx;
  const bOrder = b[orderKey] ?? swapIdx;
  return rows.map((r) => {
    if (r.id === a.id) return { ...r, [orderKey]: bOrder };
    if (r.id === b.id) return { ...r, [orderKey]: aOrder };
    return r;
  });
}

/** 比較項目のカード一覧。TOP/比較ページへの表示切り替えと並び替え、下書き保存・公開を行う。 */
export function ComparisonFieldsCms({ fields }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(fields.map((f) => [f.id, initialRow(f)])),
  );
  const [saving, startSaving] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const groups = useMemo(() => groupFieldsByDisplayGroup(fields), [fields]);

  function updateRow(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...(prev[id] as RowState), ...patch } }));
  }

  function move(id: string, orderKey: OrderKey, direction: "up" | "down") {
    setRows((prev) => {
      const next = moveOrder(Object.values(prev), id, orderKey, direction);
      return Object.fromEntries(next.map((r) => [r.id, r]));
    });
  }

  function save(publishNow: boolean) {
    startSaving(async () => {
      const updates = fields.map((field) => {
        const row = rows[field.id] ?? initialRow(field);
        return {
          id: field.id,
          show_in_top_featured: row.show_in_top_featured,
          show_in_top_table: row.show_in_top_table,
          show_in_compare_page: row.show_in_compare_page,
          top_featured_display_order: row.top_featured_display_order,
          top_table_display_order: row.top_table_display_order,
          compare_page_display_order: row.compare_page_display_order,
        };
      });
      const result = await saveComparisonLayoutDraftAction(updates, publishNow);
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4 pb-28 lg:pb-4">
      {message ? (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0 xl:grid-cols-3">
        {groups.flatMap(({ fields: groupFields }) => groupFields).map((field) => (
          <FieldCard
            key={field.id}
            field={field}
            row={rows[field.id] ?? initialRow(field)}
            onUpdate={(patch) => updateRow(field.id, patch)}
            onMove={(orderKey, direction) => move(field.id, orderKey, direction)}
          />
        ))}
        {fields.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500 lg:col-span-full">
            比較項目がありません。
          </p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pt-2 backdrop-blur [padding-bottom:calc(0.5rem+env(safe-area-inset-bottom))] lg:static lg:rounded-2xl lg:border lg:bg-white lg:p-4 lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-6xl gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => save(false)}
            className="h-12 flex-1 rounded-lg border border-blue-300 bg-blue-50 px-3 text-sm font-medium text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            下書き保存
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save(true)}
            className="h-12 flex-1 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            公開する
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldCard({
  field,
  row,
  onUpdate,
  onMove,
}: {
  field: ComparisonField;
  row: RowState;
  onUpdate: (patch: Partial<RowState>) => void;
  onMove: (orderKey: OrderKey, direction: "up" | "down") => void;
}) {
  const status: CmsBadgeStatus = field.publish_status ?? (field.is_published ? "published" : "draft");

  return (
    <article className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">{field.name}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {field.display_group || "その他"} ・ {FIELD_TYPE_LABELS[field.field_type]}
            {field.unit ? ` ・ ${field.unit}` : ""} ・ 表示順 {field.display_order}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={status} />
          {field.has_unpublished_changes ? <StatusBadge status="changed" /> : null}
        </div>
      </div>

      <div className="space-y-2">
        <ToggleRow
          label="TOP 人気3社比較"
          enabled={row.show_in_top_featured}
          order={row.top_featured_display_order}
          onToggle={() => onUpdate({ show_in_top_featured: !row.show_in_top_featured })}
          onMoveUp={() => onMove("top_featured_display_order", "up")}
          onMoveDown={() => onMove("top_featured_display_order", "down")}
        />
        <ToggleRow
          label="TOP レンタルサーバー比較"
          enabled={row.show_in_top_table}
          order={row.top_table_display_order}
          onToggle={() => onUpdate({ show_in_top_table: !row.show_in_top_table })}
          onMoveUp={() => onMove("top_table_display_order", "up")}
          onMoveDown={() => onMove("top_table_display_order", "down")}
        />
        <ToggleRow
          label="比較ページ"
          enabled={row.show_in_compare_page}
          order={row.compare_page_display_order}
          onToggle={() => onUpdate({ show_in_compare_page: !row.show_in_compare_page })}
          onMoveUp={() => onMove("compare_page_display_order", "up")}
          onMoveDown={() => onMove("compare_page_display_order", "down")}
        />
      </div>
    </article>
  );
}

function ToggleRow({
  label,
  enabled,
  order,
  onToggle,
  onMoveUp,
  onMoveDown,
}: {
  label: string;
  enabled: boolean;
  order: number | null;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-lg border ${
        enabled ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left"
      >
        <span className={`text-sm font-medium ${enabled ? "text-blue-900" : "text-slate-700"}`}>
          {label}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            enabled ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
          }`}
        >
          {enabled ? "表示中" : "非表示"}
        </span>
      </button>
      {enabled ? (
        <div className="flex items-center justify-between gap-2 border-t border-blue-200 bg-white px-3 py-2">
          <span className="text-xs text-slate-500">表示順 {order ?? "—"}</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              className="h-8 w-8 rounded-lg border border-slate-300 text-xs font-medium text-slate-700"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              className="h-8 w-8 rounded-lg border border-slate-300 text-xs font-medium text-slate-700"
            >
              ↓
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

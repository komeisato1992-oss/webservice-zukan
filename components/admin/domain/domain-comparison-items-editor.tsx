"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DOMAIN_COMPARISON_GROUP_LABELS,
  DOMAIN_COMPARISON_GROUP_ORDER,
  DOMAIN_COMPARISON_ITEM_DEFS,
  type DomainComparisonGroupKey,
} from "@/lib/admin/domain-comparison-items";
import {
  saveDomainComparisonItemsAction,
  type DomainComparisonItemSaveRow,
} from "@/lib/actions/domain-comparison-items";
import type { DomainComparisonItem } from "@/lib/types/database";

type RowState = {
  id: string;
  item_key: string;
  group_key: DomainComparisonGroupKey;
  display_name: string;
  is_visible: boolean;
  sort_order: number;
  highlight_best: boolean;
  tld_label?: string;
  kind_label: string;
};

function toRows(items: DomainComparisonItem[]): RowState[] {
  const defByKey = new Map(
    DOMAIN_COMPARISON_ITEM_DEFS.map((d) => [d.item_key, d]),
  );
  return items.map((item) => {
    const def = defByKey.get(item.item_key);
    return {
      id: item.id,
      item_key: item.item_key,
      group_key: item.group_key,
      display_name: item.display_name,
      is_visible: item.is_visible,
      sort_order: item.sort_order,
      highlight_best: item.highlight_best,
      tld_label: def?.tld_label,
      kind_label: def?.kind_label ?? item.group_key,
    };
  });
}

type Props = {
  dictionaryId: string;
  initialItems: DomainComparisonItem[];
};

export function DomainComparisonItemsEditor({
  dictionaryId,
  initialItems,
}: Props) {
  const [rows, setRows] = useState<RowState[]>(() => toRows(initialItems));
  const [openGroups, setOpenGroups] = useState<
    Record<DomainComparisonGroupKey, boolean>
  >({
    price: true,
    feature: true,
    support: true,
  });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, start] = useTransition();

  const grouped = useMemo(() => {
    const map = new Map<DomainComparisonGroupKey, RowState[]>();
    for (const key of DOMAIN_COMPARISON_GROUP_ORDER) {
      map.set(
        key,
        rows
          .filter((r) => r.group_key === key)
          .sort(
            (a, b) =>
              a.sort_order - b.sort_order ||
              a.item_key.localeCompare(b.item_key),
          ),
      );
    }
    return map;
  }, [rows]);

  function updateRow(id: string, patch: Partial<RowState>) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }

  function moveRow(
    groupKey: DomainComparisonGroupKey,
    id: string,
    direction: "up" | "down",
  ) {
    setRows((prev) => {
      const groupRows = prev
        .filter((r) => r.group_key === groupKey)
        .sort((a, b) => a.sort_order - b.sort_order);
      const idx = groupRows.findIndex((r) => r.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || swapIdx < 0 || swapIdx >= groupRows.length) return prev;

      const a = groupRows[idx];
      const b = groupRows[swapIdx];
      const aOrder = a.sort_order;
      const bOrder = b.sort_order;

      return prev.map((r) => {
        if (r.id === a.id) return { ...r, sort_order: bOrder };
        if (r.id === b.id) return { ...r, sort_order: aOrder };
        return r;
      });
    });
  }

  function saveDraft() {
    start(async () => {
      const payload: DomainComparisonItemSaveRow[] = rows.map((r) => ({
        id: r.id,
        display_name: r.display_name,
        is_visible: r.is_visible,
        sort_order: r.sort_order,
        highlight_best: r.group_key === "price" ? r.highlight_best : false,
      }));
      const result = await saveDomainComparisonItemsAction(
        dictionaryId,
        payload,
      );
      setMessage({ ok: result.ok, text: result.message });
    });
  }

  return (
    <div className="space-y-4 pb-28 lg:pb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">比較項目管理</h1>
        <p className="mt-1 text-sm text-slate-600">
          ドメイン図鑑TOP比較表の料金・機能・サポート項目の表示名・表示ON/OFF・並び順を設定します。
          保存すると公開TOPへ反映されます（サーバー図鑑には影響しません）。
        </p>
      </div>

      {message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.ok
              ? "bg-emerald-50 text-emerald-800"
              : "bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {DOMAIN_COMPARISON_GROUP_ORDER.map((groupKey) => {
        const items = grouped.get(groupKey) ?? [];
        const open = openGroups[groupKey];
        return (
          <section
            key={groupKey}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() =>
                setOpenGroups((prev) => ({
                  ...prev,
                  [groupKey]: !prev[groupKey],
                }))
              }
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50"
            >
              <span className="text-base font-semibold text-slate-900">
                {DOMAIN_COMPARISON_GROUP_LABELS[groupKey]}
              </span>
              <span className="text-sm text-slate-500">
                {open ? "閉じる" : "開く"} · {items.length}項目
              </span>
            </button>

            {open ? (
              <div className="space-y-4 border-t border-slate-100 px-3 py-4 sm:px-4">
                {groupKey === "price"
                  ? renderPriceGroups(items, updateRow, moveRow)
                  : items.map((item, index) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        canMoveUp={index > 0}
                        canMoveDown={index < items.length - 1}
                        showHighlight={false}
                        onChange={(patch) => updateRow(item.id, patch)}
                        onMove={(dir) => moveRow(groupKey, item.id, dir)}
                      />
                    ))}
              </div>
            ) : null}
          </section>
        );
      })}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="mx-auto max-w-3xl lg:max-w-none">
          <button
            type="button"
            disabled={pending}
            onClick={saveDraft}
            className="h-11 w-full rounded-lg bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-60 sm:w-auto"
          >
            {pending ? "保存中…" : "下書き保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

function renderPriceGroups(
  items: RowState[],
  updateRow: (id: string, patch: Partial<RowState>) => void,
  moveRow: (
    groupKey: DomainComparisonGroupKey,
    id: string,
    direction: "up" | "down",
  ) => void,
) {
  const tldOrder = [".com", ".jp", ".co.jp", ".net"];
  const byTld = new Map<string, RowState[]>();
  for (const item of items) {
    const label = item.tld_label ?? "その他";
    const list = byTld.get(label) ?? [];
    list.push(item);
    byTld.set(label, list);
  }

  return (
    <div className="space-y-5">
      {tldOrder.map((tld) => {
        const list = byTld.get(tld) ?? [];
        if (list.length === 0) return null;
        return (
          <div key={tld} className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">{tld}</h3>
            {list.map((item) => {
              const globalIndex = items.findIndex((r) => r.id === item.id);
              return (
                <ItemRow
                  key={item.id}
                  item={item}
                  canMoveUp={globalIndex > 0}
                  canMoveDown={globalIndex < items.length - 1}
                  showHighlight
                  onChange={(patch) => updateRow(item.id, patch)}
                  onMove={(dir) => moveRow("price", item.id, dir)}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function ItemRow({
  item,
  canMoveUp,
  canMoveDown,
  showHighlight,
  onChange,
  onMove,
}: {
  item: RowState;
  canMoveUp: boolean;
  canMoveDown: boolean;
  showHighlight: boolean;
  onChange: (patch: Partial<RowState>) => void;
  onMove: (direction: "up" | "down") => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-3.5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="inline-flex shrink-0 items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={item.is_visible}
              onChange={(e) => onChange({ is_visible: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            TOP表示
          </label>

        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            表示名
          </label>
          <input
            type="text"
            value={item.display_name}
            onChange={(e) => onChange({ display_name: e.target.value })}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
          />
        </div>

        <div className="shrink-0 lg:w-24">
          <p className="mb-1 text-xs font-medium text-slate-500">種別</p>
          <p className="text-sm text-slate-700">{item.kind_label}</p>
        </div>

        {showHighlight ? (
          <label className="inline-flex shrink-0 items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={item.highlight_best}
              onChange={(e) => onChange({ highlight_best: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            最安値強調
          </label>
        ) : (
          <span className="hidden text-sm text-slate-400 lg:inline lg:w-24">
            —
          </span>
        )}

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={!canMoveUp}
            onClick={() => onMove("up")}
            className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:opacity-40 lg:flex-none"
          >
            上へ
          </button>
          <button
            type="button"
            disabled={!canMoveDown}
            onClick={() => onMove("down")}
            className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:opacity-40 lg:flex-none"
          >
            下へ
          </button>
        </div>
      </div>
    </div>
  );
}

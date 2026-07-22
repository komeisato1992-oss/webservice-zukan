"use client";

import { useState, type ReactNode } from "react";

type Props = {
  id: string;
  title: string;
  children: ReactNode;
  filled?: number;
  total?: number;
  changes?: number;
  errors?: number;
  pending?: number;
  defaultOpen?: boolean;
};

/** セクション内をカテゴリごとに折りたためるアコーディオン。初期状態は折りたたみ。 */
export function SectionAccordion({
  id,
  title,
  children,
  filled,
  total,
  changes = 0,
  errors = 0,
  pending = 0,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const headingId = `cms-accordion-${id}-heading`;
  const panelId = `cms-accordion-${id}-panel`;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <h3 id={headingId} className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{title}</span>
            {total != null ? (
              <span className="text-xs font-normal text-slate-500">
                {filled ?? 0}/{total}
              </span>
            ) : null}
            {changes > 0 ? (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-medium text-blue-800">
                変更 {changes}
              </span>
            ) : null}
            {errors > 0 ? (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-800">
                エラー {errors}
              </span>
            ) : null}
            {pending > 0 ? (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                要確認 {pending}
              </span>
            ) : null}
          </span>
          <span
            aria-hidden
            className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </button>
      </h3>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headingId}
          className="space-y-3 border-t border-slate-100 p-4"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

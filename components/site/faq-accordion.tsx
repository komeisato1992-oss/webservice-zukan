"use client";

import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { FaqItem } from "@/lib/site/content";
import { cn } from "@/components/site/ui";

type Props = {
  items: FaqItem[];
};

/**
 * FAQアコーディオン（Client）。
 * 質問行全体が button で、タップで開閉する。
 */
export function FaqAccordion({ items }: Props) {
  const baseId = useId();
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div
      className="relative z-30 isolate divide-y divide-slate-200 border-y border-[var(--border)]"
      data-faq-accordion
    >
      {items.map((item, index) => {
        const open = openId === index;
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-btn-${index}`;
        return (
          <div key={item.question} className="relative">
            <h3 className="m-0">
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() =>
                  setOpenId((prev) => (prev === index ? null : index))
                }
                className={cn(
                  "flex w-full cursor-pointer touch-manipulation items-center justify-between gap-3 py-3.5 text-left sm:py-4",
                  "select-none transition-colors duration-150",
                  "active:bg-[var(--surface)]/80",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/35",
                )}
              >
                <span className="text-sm font-semibold leading-snug text-[var(--text-primary)]">
                  {item.question}
                </span>
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] transition duration-150",
                    open && "text-[var(--text-primary)]",
                  )}
                  aria-hidden
                >
                  {open ? (
                    <Minus size={16} strokeWidth={2} />
                  ) : (
                    <Plus size={16} strokeWidth={2} />
                  )}
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-150 ease-out",
                open
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <p
                  className={cn(
                    "pb-3.5 text-sm leading-relaxed text-[var(--text-body)]",
                    !open && "invisible",
                  )}
                >
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

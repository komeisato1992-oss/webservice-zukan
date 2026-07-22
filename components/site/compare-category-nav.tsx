"use client";

import { COMPARE_CATEGORY_LINKS } from "@/lib/site/content";
import { usePurposeSelection } from "@/components/site/purpose-selection-context";
import { cn } from "@/components/site/ui";

/** おすすめ比較カテゴリ（PurposeSelection と同期） */
export function CompareCategoryNav() {
  const { activeId, setActiveId } = usePurposeSelection();

  return (
    <nav
      aria-label="おすすめ比較カテゴリ"
      className="relative z-[1] mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 sm:mt-2.5"
    >
      <p className="shrink-0 text-[12px] font-medium text-[var(--text-muted)] sm:text-[13px]">
        おすすめ比較カテゴリ
      </p>
      <ul className="flex min-w-0 flex-wrap items-center gap-1.5">
        {COMPARE_CATEGORY_LINKS.map((item) => {
          const active = activeId === item.purposeId;
          return (
            <li key={item.purposeId} className="shrink-0">
              <button
                type="button"
                onClick={() =>
                  setActiveId(item.purposeId, { scroll: true })
                }
                className={cn(
                  "inline-flex h-7 touch-manipulation items-center whitespace-nowrap rounded-md border px-2.5 text-[12px] font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35 sm:text-[13px]",
                  active
                    ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                    : "border-[var(--border)] bg-white text-[var(--navy)] hover:border-[var(--navy)]/30 hover:bg-[var(--surface)]",
                )}
                aria-pressed={active}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

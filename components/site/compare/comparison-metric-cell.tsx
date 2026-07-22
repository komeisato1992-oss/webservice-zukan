"use client";

import { Star } from "lucide-react";
import { CompareFieldHelp } from "@/components/site/compare/compare-field-help";
import { resolveFieldNameDisplay } from "@/lib/site/field-name-display";
import { cn } from "@/components/site/ui";

type Props = {
  label: string;
  fieldSlug?: string | null;
  description?: string | null;
  sortable?: boolean;
  active?: boolean;
  onSort?: () => void;
  className?: string;
  /** スマホで短縮ラベル・改行を使う（TOP比較表など） */
  compactLabel?: boolean;
};

/**
 * 比較表1列目：項目セル全体で並び替え、ⓘのみ説明表示。
 */
export function ComparisonMetricCell({
  label,
  fieldSlug,
  description,
  sortable = false,
  active = false,
  onSort,
  className,
  compactLabel = false,
}: Props) {
  const display = compactLabel
    ? resolveFieldNameDisplay(label, fieldSlug)
    : { shortLabel: label, lines: [label] };
  const helpName = display.shortLabel;

  return (
    <div
      role={sortable ? "button" : undefined}
      tabIndex={sortable ? 0 : undefined}
      onClick={
        sortable
          ? () => {
              onSort?.();
            }
          : undefined
      }
      onKeyDown={
        sortable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSort?.();
              }
            }
          : undefined
      }
      className={cn(
        "mx-auto flex w-full max-w-full flex-col items-center justify-center gap-0.5 px-0.5 py-0.5 text-center sm:gap-1 sm:px-1 sm:py-1",
        sortable &&
          "cursor-pointer touch-manipulation transition-colors duration-150 active:bg-[var(--accent-soft)]/60",
        active && "text-[var(--navy)]",
        className,
      )}
      aria-label={sortable ? `${helpName}でおすすめ順に並び替え` : undefined}
    >
      <div className="flex max-w-full items-center justify-center gap-0.5">
        <span
          className={cn(
            "jp-keep font-bold leading-snug",
            compactLabel
              ? "text-[10px] sm:text-[12px]"
              : "whitespace-nowrap text-[11px] sm:text-[12px]",
          )}
        >
          {display.lines.map((line, i) => (
            <span
              key={`${line}-${i}`}
              className={cn(
                "block jp-keep",
                compactLabel ? "whitespace-nowrap" : undefined,
              )}
            >
              {line}
            </span>
          ))}
        </span>
        {sortable ? (
          <Star
            size={12}
            className={cn(
              "shrink-0",
              active
                ? "fill-[var(--accent)] text-[var(--accent)]"
                : "text-[var(--text-muted)]",
            )}
            aria-hidden
          />
        ) : null}
        <span
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className="inline-flex"
        >
          <CompareFieldHelp
            name={helpName}
            slug={fieldSlug}
            description={description}
            dense={compactLabel}
          />
        </span>
      </div>
      {sortable ? (
        <p className="hidden whitespace-nowrap text-[10px] font-normal leading-none text-[var(--text-muted)] sm:block sm:text-[11px]">
          クリックで並び替え
        </p>
      ) : null}
    </div>
  );
}

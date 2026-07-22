"use client";

import { useEffect, useState } from "react";
import { Check, GitCompareArrows, Plus } from "lucide-react";
import { useCompare } from "@/components/site/compare/compare-context";
import { buttonClass, cn, ICON_SM } from "@/components/site/ui";

type Props = {
  slug: string;
  name: string;
  categorySlug: string;
  className?: string;
  size?: "sm" | "md";
  /** primary = 青で目立たせる */
  emphasis?: "primary" | "secondary";
};

export function AddToCompareButton({
  slug,
  name,
  categorySlug,
  className = "",
  size = "md",
  emphasis = "secondary",
}: Props) {
  const { has, toggle, items, max } = useCompare();
  const selected = has(slug);
  const full = !selected && items.length >= max;
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (!pop) return;
    const t = window.setTimeout(() => setPop(false), 320);
    return () => window.clearTimeout(t);
  }, [pop]);

  function onClick() {
    if (full) return;
    const wasSelected = selected;
    toggle({ slug, name, categorySlug });
    if (!wasSelected) setPop(true);
  }

  const btnSize = size === "sm" ? "sm" : "md";

  if (selected) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed
        className={cn(
          buttonClass("secondary", btnSize),
          "border-[var(--accent)]/35 bg-[var(--accent-soft)] text-[var(--accent)]",
          pop && "compare-pop",
          className,
        )}
      >
        <Check size={ICON_SM} strokeWidth={2.5} aria-hidden />
        比較中
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={full}
      onClick={onClick}
      aria-pressed={false}
      className={cn(
        buttonClass(emphasis === "primary" ? "primary" : "secondary", btnSize),
        pop && "compare-pop",
        className,
      )}
    >
      {full ? (
        <>比較は{max}件まで</>
      ) : (
        <>
          {emphasis === "primary" ? (
            <GitCompareArrows size={ICON_SM} aria-hidden />
          ) : (
            <Plus size={ICON_SM} aria-hidden />
          )}
          比較に追加
        </>
      )}
    </button>
  );
}

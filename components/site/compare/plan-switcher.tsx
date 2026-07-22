"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { ServicePlan } from "@/lib/types/database";
import { formatPlanOptionLabel } from "@/lib/site/plan-utils";
import { formatPlanLabelFromPlan } from "@/lib/site/service-name-display";
import { cn } from "@/components/site/ui";

type Props = {
  plans: ServicePlan[];
  selectedPlanId: string | null;
  onChange: (planId: string) => void;
  /** ヘッダーが暗い背景（比較表 navy）のとき */
  tone?: "dark" | "light";
  /**
   * ServicePlanHeader がプラン名を出す場合 true。
   * 1件だけのときの生プラン名表示を抑止し、重複を防ぐ。
   */
  hideWhenSingle?: boolean;
  className?: string;
};

/**
 * プランが2件以上 → ドロップダウン（選択中はプラン名のみ、一覧は価格付き）
 * プランが1件のみ → プラン名を小さく表示（ドロップダウンなし）
 * プラン0件 → 何も出さない
 */
export function PlanSwitcher({
  plans,
  selectedPlanId,
  onChange,
  tone = "dark",
  hideWhenSingle = false,
  className = "",
}: Props) {
  const published = plans.filter((p) => p.is_published);
  if (published.length === 0) return null;

  if (published.length === 1) {
    if (hideWhenSingle) return null;
    const label = formatPlanLabelFromPlan(published[0]);
    if (!label) return null;
    return (
      <p
        className={cn(
          "mt-0.5 max-w-[7.5rem] text-center text-[10px] leading-snug text-pretty",
          tone === "dark" ? "text-white/70" : "text-[var(--text-muted)]",
          className,
        )}
      >
        <span className="jp-keep">{label}</span>
      </p>
    );
  }

  const value =
    selectedPlanId && published.some((p) => p.id === selectedPlanId)
      ? selectedPlanId
      : published[0].id;
  const selected = published.find((p) => p.id === value) ?? published[0];
  const selectedLabel =
    formatPlanOptionLabel(selected, { includePrice: false }) || selected.name;

  return (
    <PlanDropdown
      plans={published}
      value={value}
      selectedLabel={selectedLabel}
      onChange={onChange}
      tone={tone}
      className={className}
    />
  );
}

type MenuPos = {
  top?: number;
  bottom?: number;
  left: number;
  minWidth: number;
  maxHeight: number;
};

function PlanDropdown({
  plans,
  value,
  selectedLabel,
  onChange,
  tone,
  className,
}: {
  plans: ServicePlan[];
  value: string;
  selectedLabel: string;
  onChange: (planId: string) => void;
  tone: "dark" | "light";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const canPortal = typeof document !== "undefined";

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;

    const place = () => {
      const btn = btnRef.current?.getBoundingClientRect();
      if (!btn) return;
      const gap = 4;
      const pad = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const menuHeight = menuRef.current?.offsetHeight ?? 192;
      const spaceBelow = vh - btn.bottom - pad;
      const spaceAbove = btn.top - pad;
      const openUp = spaceBelow < Math.min(menuHeight, 192) && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        120,
        Math.min(192, openUp ? spaceAbove - gap : spaceBelow - gap),
      );
      const minWidth = Math.max(btn.width, 7.5 * 16);
      let left = btn.left + btn.width / 2;
      const half = minWidth / 2;
      left = Math.min(Math.max(pad + half, left), vw - pad - half);

      setPos(
        openUp
          ? {
              bottom: vh - (btn.top - gap),
              left,
              minWidth,
              maxHeight,
            }
          : {
              top: btn.bottom + gap,
              left,
              minWidth,
              maxHeight,
            },
      );
    };

    place();
    const raf = window.requestAnimationFrame(place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, plans.length]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: Event) => {
      const t = event.target;
      if (!(t instanceof Node)) return;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      className={cn("relative mt-0.5 w-full max-w-[8.5rem] sm:mt-1", className)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-7 w-full cursor-pointer items-center justify-center gap-0.5 rounded-md border px-1.5 text-center text-[10px] font-medium leading-tight outline-none transition sm:h-8 sm:text-[11px]",
          tone === "dark"
            ? "border-white/25 bg-white/10 text-white hover:bg-white/15 focus:border-white/50 focus:ring-1 focus:ring-white/30"
            : "border-[var(--border)] bg-white text-[var(--text-primary)] focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/20",
        )}
      >
        <span className="jp-keep min-w-0 truncate">{selectedLabel}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "shrink-0 opacity-75 transition",
            open && "rotate-180",
            tone === "dark" ? "text-white/75" : "text-[var(--text-muted)]",
          )}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {canPortal && open
        ? createPortal(
            <ul
              ref={menuRef}
              id={listId}
              role="listbox"
              className={cn(
                "fixed z-[100] max-h-48 w-max overflow-auto rounded-md border py-1 shadow-lg",
                tone === "dark"
                  ? "border-white/20 bg-[var(--navy-deep)] text-white"
                  : "border-[var(--border)] bg-white text-[var(--text-primary)]",
              )}
              style={
                pos
                  ? {
                      top: pos.top,
                      bottom: pos.bottom,
                      left: pos.left,
                      minWidth: pos.minWidth,
                      maxHeight: pos.maxHeight,
                      transform: "translateX(-50%)",
                    }
                  : { visibility: "hidden", top: 0, left: 0 }
              }
            >
              {plans.map((plan) => {
                const active = plan.id === value;
                return (
                  <li key={plan.id} role="option" aria-selected={active}>
                    <button
                      type="button"
                      className={cn(
                        "block w-full whitespace-nowrap px-2.5 py-1.5 text-left text-[10px] leading-snug sm:text-[11px]",
                        active
                          ? tone === "dark"
                            ? "bg-white/15 font-semibold"
                            : "bg-[var(--surface)] font-semibold"
                          : tone === "dark"
                            ? "hover:bg-white/10"
                            : "hover:bg-[var(--surface)]",
                      )}
                      onClick={() => {
                        onChange(plan.id);
                        setOpen(false);
                      }}
                    >
                      <span className="jp-keep">
                        {formatPlanOptionLabel(plan, { includePrice: true })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}

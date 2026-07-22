"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import { resolveFieldHelpText } from "@/lib/site/field-help";
import { cn } from "@/components/site/ui";

type Props = {
  name: string;
  slug?: string | null;
  description?: string | null;
  className?: string;
  /** 見た目は小さく、タップ領域は約40px確保 */
  dense?: boolean;
};

type Pos = {
  top: number;
  left: number;
  placement: "right" | "top" | "left" | "bottom";
};

/** 行ごとの matchMedia 購読を避ける共有ストア */
const mobileListeners = new Set<() => void>();
let mobileMatches = false;
let mobileBound = false;

function ensureMobileMedia(breakpointPx: number) {
  if (mobileBound || typeof window === "undefined") return;
  mobileBound = true;
  const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
  const apply = () => {
    mobileMatches = mq.matches;
    for (const l of mobileListeners) l();
  };
  apply();
  mq.addEventListener("change", apply);
}

function useIsMobile(breakpointPx = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    ensureMobileMedia(breakpointPx);
    const sync = () => setMobile(mobileMatches);
    sync();
    mobileListeners.add(sync);
    return () => {
      mobileListeners.delete(sync);
    };
  }, [breakpointPx]);
  return mobile;
}

/**
 * 比較項目ヘルプ（全ページ共通）。
 * PC: 右→上→左→下の衝突回避ポップオーバー
 * スマホ: 小型ボトムシート（タップで開閉、外側で閉じる）
 */
export function CompareFieldHelp({
  name,
  slug,
  description,
  className,
  dense = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const panelId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const text = resolveFieldHelpText({ name, slug, description });
  const canPortal = typeof document !== "undefined";
  const isMobile = useIsMobile();

  useLayoutEffect(() => {
    if (!open || !btnRef.current || isMobile) return;

    const place = () => {
      const btn = btnRef.current?.getBoundingClientRect();
      const panel = panelRef.current?.getBoundingClientRect();
      if (!btn) return;
      const pw = panel?.width ?? 240;
      const ph = panel?.height ?? 120;
      const gap = 8;
      const pad = 12;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const candidates: Pos[] = [
        {
          placement: "right",
          top: btn.top + btn.height / 2 - ph / 2,
          left: btn.right + gap,
        },
        {
          placement: "top",
          top: btn.top - ph - gap,
          left: btn.left + btn.width / 2 - pw / 2,
        },
        {
          placement: "left",
          top: btn.top + btn.height / 2 - ph / 2,
          left: btn.left - pw - gap,
        },
        {
          placement: "bottom",
          top: btn.bottom + gap,
          left: btn.left + btn.width / 2 - pw / 2,
        },
      ];

      const fits = (p: Pos) =>
        p.top >= pad &&
        p.left >= pad &&
        p.top + ph <= vh - pad &&
        p.left + pw <= vw - pad;

      const chosen = candidates.find(fits) ?? {
        placement: "right" as const,
        top: Math.min(Math.max(pad, btn.top), vh - ph - pad),
        left: Math.min(Math.max(pad, btn.right + gap), vw - pw - pad),
      };

      setPos({
        ...chosen,
        top: Math.min(Math.max(pad, chosen.top), vh - ph - pad),
        left: Math.min(Math.max(pad, chosen.left), vw - pw - pad),
      });
    };

    place();
    requestAnimationFrame(place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, text, isMobile]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: Event) => {
      const t = event.target;
      if (!(t instanceof Node)) return;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
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

  const toggle = (e: MouseEvent | PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
  };

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <button
        ref={btnRef}
        type="button"
        className={cn(
          "relative shrink-0 touch-manipulation items-center justify-center rounded-full text-[var(--text-muted)] transition duration-150 hover:bg-black/5 hover:text-[var(--navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35",
          dense
            ? "inline-flex h-4 w-4 before:absolute before:inset-[-12px] before:content-[''] sm:h-6 sm:w-6 sm:before:hidden"
            : "inline-flex h-10 w-10 sm:h-6 sm:w-6",
        )}
        aria-label={`${name}の説明`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Info
          size={dense ? 14 : 15}
          strokeWidth={2}
          aria-hidden
          className="sm:h-3.5 sm:w-3.5"
        />
      </button>
      {canPortal && open
        ? createPortal(
            isMobile ? (
              <div className="fixed inset-0 z-[80]" role="presentation">
                <button
                  type="button"
                  aria-label="説明を閉じる"
                  className="absolute inset-0 bg-black/30"
                  onClick={() => setOpen(false)}
                />
                <div
                  ref={panelRef}
                  id={panelId}
                  role="dialog"
                  aria-label={`${name}の説明`}
                  className="absolute inset-x-0 bottom-0 max-h-[42vh] overflow-y-auto rounded-t-[var(--radius-card)] border border-[var(--border)] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_28px_rgba(15,35,71,0.18)]"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <p className="text-[13px] font-bold text-[var(--text-primary)]">
                      {name}とは
                    </p>
                    <button
                      type="button"
                      aria-label="閉じる"
                      onClick={() => setOpen(false)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-muted)]"
                    >
                      <X size={16} aria-hidden />
                    </button>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[var(--text-body)]">
                    {text}
                  </p>
                </div>
              </div>
            ) : (
              <div
                ref={panelRef}
                id={panelId}
                role="tooltip"
                className="fixed z-[80] w-[min(16rem,calc(100vw-1.5rem))] rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-3 text-left shadow-[0_10px_28px_rgba(15,35,71,0.16)]"
                style={
                  pos
                    ? { top: pos.top, left: pos.left }
                    : { visibility: "hidden", top: 0, left: 0 }
                }
              >
                <p className="text-[12px] font-bold text-[var(--text-primary)]">
                  {name}とは
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-body)]">
                  {text}
                </p>
              </div>
            ),
            document.body,
          )
        : null}
    </span>
  );
}

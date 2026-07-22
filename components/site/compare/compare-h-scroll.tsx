"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CompareScrollArea } from "@/components/site/compare/compare-scroll-area";
import { cn } from "@/components/site/ui";

type Props = {
  children: ReactNode;
  className?: string;
  /** CompareScrollArea に付与するクラス（sticky 閉じ込め用） */
  scrollClassName?: string;
  /** 4サービス目以降があるとき案内を出す */
  showHints?: boolean;
  /** @deprecated sticky 列と衝突するため未使用 */
  snapSizePx?: number;
};

/**
 * 比較表の横スクロール＋端グラデーション／矢印案内。
 * scroll-snap は sticky 項目列と衝突して左端サービスを隠すため使わない。
 */
export function CompareHScroll({
  children,
  className,
  scrollClassName,
  showHints = true,
}: Props) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 2) {
      setCanLeft(false);
      setCanRight(false);
      return;
    }
    const nextLeft = el.scrollLeft > 4;
    const nextRight = el.scrollLeft < max - 24;
    setCanLeft((prev) => (prev === nextLeft ? prev : nextLeft));
    setCanRight((prev) => (prev === nextRight ? prev : nextRight));
  }, [el]);

  useEffect(() => {
    if (!el) return;

    // 初期表示は必ず左端(0)。レイアウト確定後にも再適用する
    const resetLeft = () => {
      el.scrollTo(0, 0);
    };
    resetLeft();
    let rafScroll: number | null = null;
    const onScroll = () => {
      if (rafScroll != null) return;
      rafScroll = window.requestAnimationFrame(() => {
        rafScroll = null;
        update();
      });
    };
    const t0 = window.requestAnimationFrame(() => {
      resetLeft();
      update();
    });
    const t1 = window.setTimeout(() => {
      resetLeft();
      update();
    }, 120);

    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      window.cancelAnimationFrame(t0);
      if (rafScroll != null) window.cancelAnimationFrame(rafScroll);
      window.clearTimeout(t1);
    };
  }, [el, update]);

  return (
    <div className="relative">
      <CompareScrollArea
        ref={setEl}
        className={cn(scrollClassName, className)}
      >
        {children}
      </CompareScrollArea>

      {showHints && canLeft ? (
        <div
          className="pointer-events-none absolute inset-y-0 z-[5] w-7 bg-gradient-to-r from-white via-white/80 to-transparent sm:hidden"
          style={{ left: "var(--compare-label-col, 5.5rem)" }}
          aria-hidden
        >
          <ChevronLeft
            size={16}
            className="absolute left-0.5 top-1/2 -translate-y-1/2 text-[var(--navy)]/55"
          />
        </div>
      ) : null}

      {showHints && canRight ? (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-8 bg-gradient-to-l from-white via-white/85 to-transparent sm:hidden"
          aria-hidden
        >
          <ChevronRight
            size={16}
            className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[var(--navy)]/60"
          />
        </div>
      ) : null}
    </div>
  );
}

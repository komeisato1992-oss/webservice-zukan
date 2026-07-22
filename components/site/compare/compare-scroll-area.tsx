"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/components/site/ui";

type Props = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * 比較表用スクロール領域。
 *
 * - スマホ: max-height なし想定。縦はページ全体、横だけ表内スクロール
 * - PC: max-height 付き。縦端到達後はホイール／トラックパッドをページへ伝播
 * - 横スクロール比較操作は維持（overscroll-x: contain）
 */
export const CompareScrollArea = forwardRef<HTMLDivElement, Props>(
  function CompareScrollArea({ children, className, style }, forwardedRef) {
    const localRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const el = localRef.current;
      if (!el) return;

      const onWheel = (event: WheelEvent) => {
        if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
        if (event.deltaY === 0) return;

        const maxScroll = el.scrollHeight - el.clientHeight;
        if (maxScroll <= 1) return;

        const top = el.scrollTop;
        const atTop = top <= 0;
        const atBottom = top >= maxScroll - 1;
        const goingUp = event.deltaY < 0;
        const goingDown = event.deltaY > 0;

        if ((goingUp && atTop) || (goingDown && atBottom)) {
          window.scrollBy({ top: event.deltaY, left: 0, behavior: "instant" });
          event.preventDefault();
        }
      };

      el.addEventListener("wheel", onWheel, { passive: false });
      return () => {
        el.removeEventListener("wheel", onWheel);
      };
    }, []);

    return (
      <div
        ref={(node) => {
          localRef.current = node;
          if (typeof forwardedRef === "function") {
            forwardedRef(node);
          } else if (forwardedRef) {
            forwardedRef.current = node;
          }
        }}
        className={cn(
          "overflow-auto overscroll-x-contain overscroll-y-auto",
          className,
        )}
        style={style}
      >
        {children}
      </div>
    );
  },
);

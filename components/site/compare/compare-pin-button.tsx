"use client";

import { Pin } from "lucide-react";
import { cn } from "@/components/site/ui";

type Props = {
  serviceName: string;
  pinned: boolean;
  onToggle: () => void;
  tone?: "dark" | "light";
  className?: string;
};

/**
 * 比較表ヘッダー用ピン。タップ／クリックで左側固定。
 */
export function ComparePinButton({
  serviceName,
  pinned,
  onToggle,
  tone = "dark",
  className,
}: Props) {
  const label = pinned
    ? `${serviceName}の固定を解除`
    : `${serviceName}を左側に固定`;

  return (
    <button
      type="button"
      title={pinned ? "固定を解除" : "左側に固定"}
      aria-label={label}
      aria-pressed={pinned}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-md transition duration-150 sm:h-8 sm:w-8",
        "focus-visible:outline-none focus-visible:ring-2",
        tone === "dark"
          ? "text-white/70 hover:bg-white/10 hover:text-white focus-visible:ring-white/40"
          : "text-[var(--text-muted)] hover:bg-black/5 hover:text-[var(--navy)] focus-visible:ring-[var(--accent)]/35",
        pinned &&
          (tone === "dark"
            ? "bg-white/15 text-[var(--accent)]"
            : "bg-[var(--accent-soft)] text-[var(--accent)]"),
        className,
      )}
    >
      <Pin
        size={16}
        strokeWidth={2}
        className={cn(pinned && "fill-current")}
        aria-hidden
      />
    </button>
  );
}

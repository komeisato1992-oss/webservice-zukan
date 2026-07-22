import Image from "next/image";
import { Server } from "lucide-react";

type Props = {
  name: string;
  logoUrl: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
  /**
   * ロゴ未登録時の表示。
   * - icon: 汎用サーバーアイコン（比較表ヘッダーなど）
   * - none: アイコン枠を出さず null（サービス名のみのレイアウト向け）
   */
  fallback?: "icon" | "none";
};

const SIZE_MAP = {
  sm: { box: "h-10 w-10", px: 40, icon: 18 },
  md: { box: "h-14 w-14", px: 56, icon: 24 },
  lg: { box: "h-20 w-20", px: 80, icon: 32 },
} as const;

/**
 * 表示優先: 公式ロゴ →（呼び出し側でサービス名）→ 小さな汎用サーバーアイコン。
 * 頭文字だけのプレースホルダーは使わない。
 */
export function ServiceLogo({
  name,
  logoUrl,
  size = "md",
  className = "",
  fallback = "icon",
}: Props) {
  const dim = SIZE_MAP[size];

  if (!logoUrl) {
    if (fallback === "none") return null;
    return (
      <div
        className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--surface)] ring-1 ring-[var(--border)]/80 ${dim.box} ${className}`}
        aria-hidden
      >
        <Server
          size={dim.icon}
          strokeWidth={1.75}
          className="text-[var(--text-muted)]"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-[var(--border)]/80 ${dim.box} ${className}`}
    >
      <Image
        src={logoUrl}
        alt={`${name}のロゴ`}
        width={dim.px}
        height={dim.px}
        className="h-full w-full object-contain p-1.5"
      />
    </div>
  );
}

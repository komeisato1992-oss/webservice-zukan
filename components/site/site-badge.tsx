import {
  Award,
  Flame,
  Gift,
  Sparkles,
  Star,
  Timer,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn, ICON_SM } from "@/components/site/ui";

export type SiteBadgeVariant =
  | "rank"
  | "recommend"
  | "campaign"
  | "beginner"
  | "popular"
  | "new"
  | "featured"
  | "limited";

const VARIANT: Record<
  SiteBadgeVariant,
  { icon: LucideIcon; label: string; className: string }
> = {
  rank: {
    icon: Award,
    label: "順位",
    className:
      "bg-[var(--navy)] text-white ring-[var(--navy)]/20",
  },
  recommend: {
    icon: Star,
    label: "おすすめ",
    className:
      "bg-amber-50 text-amber-900 ring-amber-200/80",
  },
  campaign: {
    icon: Gift,
    label: "キャンペーン",
    className:
      "bg-rose-50 text-rose-800 ring-rose-200/80",
  },
  beginner: {
    icon: Sparkles,
    label: "初心者向け",
    className:
      "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  },
  popular: {
    icon: Flame,
    label: "人気",
    className:
      "bg-orange-50 text-orange-800 ring-orange-200/80",
  },
  new: {
    icon: TrendingUp,
    label: "新着",
    className:
      "bg-sky-50 text-sky-800 ring-sky-200/80",
  },
  featured: {
    icon: Star,
    label: "おすすめ",
    className:
      "bg-[var(--accent-soft)] text-[var(--accent)] ring-[var(--accent)]/20",
  },
  limited: {
    icon: Timer,
    label: "期間限定",
    className:
      "bg-violet-50 text-violet-800 ring-violet-200/80",
  },
};

type Props = {
  variant: SiteBadgeVariant;
  /** rank 用: 1 / 2 / 3 など */
  rank?: number;
  children?: React.ReactNode;
  className?: string;
  /** アイコンを隠す（テキストのみ） */
  hideIcon?: boolean;
};

/**
 * サイト共通バッジ。色・アイコン・文言の3要素で判別。
 */
export function SiteBadge({
  variant,
  rank,
  children,
  className,
  hideIcon = false,
}: Props) {
  const meta = VARIANT[variant];
  const Icon = meta.icon;
  const label =
    variant === "rank" && rank != null
      ? `第${rank}位`
      : children ?? meta.label;

  return (
    <span
      className={cn(
        "site-badge inline-flex h-[var(--badge-height)] items-center gap-1 rounded-md px-2 text-[11px] font-semibold leading-none ring-1",
        meta.className,
        className,
      )}
    >
      {!hideIcon ? (
        <Icon size={ICON_SM - 2} strokeWidth={2} aria-hidden />
      ) : null}
      <span className="jp-keep whitespace-nowrap">{label}</span>
    </span>
  );
}

/** ランキング①②③用の角バッジ */
export function RankCornerBadge({
  rank,
  className,
}: {
  rank: number;
  className?: string;
}) {
  if (rank < 1 || rank > 3) return null;
  const marks = ["①", "②", "③"] as const;
  return (
    <span
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-[var(--navy)] px-1.5 text-[13px] font-bold leading-none text-white shadow-sm ring-1 ring-black/10",
        className,
      )}
      aria-label={`${rank}位`}
    >
      <span aria-hidden>{marks[rank - 1]}</span>
    </span>
  );
}

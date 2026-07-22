import { ExternalLink } from "lucide-react";
import { OutboundLink } from "@/components/site/outbound-link";
import { cn, ICON_SM } from "@/components/site/ui";

type Size = "sm" | "md";

type Props = {
  href: string;
  isAffiliate: boolean;
  label?: string;
  size?: Size;
  className?: string;
  fullWidth?: boolean;
};

const sizeClass: Record<Size, string> = {
  sm: "h-10 min-h-10 px-2.5 text-[11px] sm:h-11 sm:text-[12px]",
  md: "h-11 min-h-11 px-3.5 text-[13px] sm:h-12 sm:text-[14px]",
};

/**
 * 公式サイト誘導ボタン（TOP / 比較 / 一覧 / 詳細で共通）。
 */
export function OfficialSiteButton({
  href,
  isAffiliate,
  label = "公式サイトへ",
  size = "sm",
  className,
  fullWidth = true,
}: Props) {
  return (
    <OutboundLink
      href={href}
      isAffiliate={isAffiliate}
      aria-label={`${label}（外部サイト）`}
      className={cn(
        "official-site-btn inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--accent)] font-bold text-white shadow-[0_2px_0_rgba(15,35,71,0.18)] transition-[transform,background-color,box-shadow] duration-150 ease-out",
        "hover:bg-[var(--accent-hover)] hover:shadow-[0_3px_0_rgba(15,35,71,0.2)]",
        "active:translate-y-px active:shadow-[0_1px_0_rgba(15,35,71,0.16)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 focus-visible:ring-offset-2",
        fullWidth && "w-full",
        sizeClass[size],
        className,
      )}
    >
      <span className="jp-keep whitespace-nowrap">{label}</span>
      <ExternalLink size={ICON_SM} strokeWidth={2} aria-hidden />
    </OutboundLink>
  );
}

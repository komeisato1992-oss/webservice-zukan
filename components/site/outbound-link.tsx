import { outboundRel } from "@/lib/links";

type Props = {
  href: string;
  isAffiliate?: boolean;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
};

/** 公式/アフィリエイト外部リンクを安全に出力 */
export function OutboundLink({
  href,
  isAffiliate = false,
  children,
  className,
  "aria-label": ariaLabel,
}: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel={outboundRel(isAffiliate)}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}

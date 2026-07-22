import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { buildBreadcrumbJsonLd } from "@/lib/site/seo";

/** 統一アイコンサイズ（lucide） */
export const ICON_SM = 14;
export const ICON_MD = 16;
export const ICON_LG = 18;

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "link" | "onDark" | "onDarkOutline";
type ButtonSize = "sm" | "md" | "lg";

const btnBase =
  "inline-flex items-center justify-center gap-1.5 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const btnVariant: Record<ButtonVariant, string> = {
  /* Primary: ネイビー背景・白文字 */
  primary:
    "bg-[var(--navy)] text-white hover:bg-[var(--navy-light)]",
  /* Secondary: 白背景・ネイビー文字・薄い枠 */
  secondary:
    "border border-[var(--navy)]/25 bg-white text-[var(--navy)] hover:border-[var(--navy)]/45 hover:bg-[var(--surface)]",
  /* Ghost: 背景なし */
  ghost:
    "bg-transparent text-[var(--text-body)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]",
  link: "bg-transparent text-[var(--accent)] hover:text-[var(--accent-hover)] underline-offset-4 hover:underline",
  /* ネイビー面上の主CTA（白ボタン） */
  onDark:
    "bg-white text-[var(--navy)] hover:bg-white/90",
  /* ネイビー面上の補助CTA */
  onDarkOutline:
    "border border-white/40 bg-transparent text-white hover:bg-white/10",
};

const btnSize: Record<ButtonSize, string> = {
  sm: "h-8 rounded-[var(--radius-btn)] px-2.5 text-[12px]",
  md: "h-11 rounded-[var(--radius-btn)] px-4 text-[13px]",
  lg: "h-12 rounded-[var(--radius-btn)] px-5 text-sm",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = "",
) {
  return cn(btnBase, btnVariant[variant], btnSize[size], className);
}

export function SiteButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button className={buttonClass(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

export function SiteLinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

export function SiteCard({
  className,
  children,
  hover = false,
}: {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-[var(--card-padding)] shadow-[var(--shadow-card)] sm:p-[var(--card-padding-md)]",
        hover &&
          "transition-[border-color,box-shadow,transform] duration-150 ease-out hover:border-[var(--navy)]/25 hover:shadow-[var(--shadow-card-hover)] motion-reduce:transform-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  eyebrow,
  className,
  emphasis = false,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  className?: string;
  /** 比較表など主役セクション向け */
  emphasis?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow ? (
        <p className="text-[11px] font-medium tracking-wide text-[var(--text-muted)]">
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "font-bold leading-snug tracking-tight text-[var(--text-primary)]",
          eyebrow ? "mt-1" : "",
          emphasis
            ? "text-[1.25rem] sm:text-[1.5rem] lg:text-[1.625rem]"
            : "text-[1.25rem] sm:text-[1.375rem] lg:text-[1.5rem]",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-[var(--text-body)] sm:text-sm">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: React.ReactNode;
  tone?: "blue" | "amber" | "green" | "slate" | "navy";
  className?: string;
}) {
  const tones = {
    blue: "bg-[var(--accent-soft)] text-[var(--accent)] ring-[var(--accent)]/15",
    amber: "bg-amber-50 text-amber-900 ring-amber-100",
    green: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    slate: "bg-[var(--surface)] text-[var(--text-body)] ring-[var(--border)]",
    navy: "bg-[var(--navy)]/8 text-[var(--navy)] ring-[var(--navy)]/15",
  };
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md px-1.5 text-[10px] font-medium ring-1",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function FeatureTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
      {children}
    </span>
  );
}

export function IconBadge({
  icon: Icon,
  className,
  size = "md",
}: {
  icon: LucideIcon;
  className?: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-7 w-7 rounded-md" : "h-8 w-8 rounded-lg";
  const iconSize = size === "sm" ? ICON_SM : ICON_MD;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center bg-[var(--surface-navy-tint)] text-[var(--navy)]",
        box,
        className,
      )}
    >
      <Icon size={iconSize} strokeWidth={1.75} aria-hidden />
    </span>
  );
}

export function SectionShell({
  id,
  tone = "white",
  children,
  className,
  innerClassName,
}: {
  id?: string;
  tone?: "white" | "blue" | "gray" | "soft" | "deep" | "navyTint" | "compare";
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  const tones = {
    white: "bg-white",
    blue: "bg-[var(--surface)]",
    gray: "bg-[var(--surface-muted)]",
    soft: "bg-[var(--surface-tint)]",
    navyTint: "bg-[var(--surface-navy-tint)]",
    compare: "bg-[var(--surface-blue)]",
    deep: "bg-[var(--navy)] text-white",
  };
  return (
    <section id={id} className={cn("site-section", tones[tone], className)}>
      <div className={cn("site-section-inner", innerClassName)}>{children}</div>
    </section>
  );
}

/** パンくず共通（HTML + BreadcrumbList JSON-LD） */
export function Breadcrumb({
  items,
}: {
  items: Array<{ href?: string; label: string }>;
}) {
  const jsonLd = buildBreadcrumbJsonLd(
    items.map((item) => ({
      name: item.label,
      path: item.href,
    })),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="パンくず" className="text-[12px] text-[var(--text-muted)] sm:text-[13px]">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {items.map((item, i) => (
            <li key={`${item.label}-${i}`} className="inline-flex items-center gap-1.5">
              {i > 0 ? <span aria-hidden>/</span> : null}
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-[var(--text-body)] hover:text-[var(--accent)]"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-[var(--text-primary)]">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

/** ページ冒頭の価値表示 */
export function PageValueProps({
  items,
  onDark = false,
}: {
  items: string[];
  onDark?: boolean;
}) {
  return (
    <ul
      className={cn(
        "flex flex-wrap gap-x-4 gap-y-1.5",
        onDark ? "text-white/88" : "text-[var(--text-body)]",
      )}
    >
      {items.map((text) => (
        <li key={text} className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px]">
          <span
            className={cn(
              "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
              onDark
                ? "bg-white/20 text-white"
                : "bg-[var(--navy)]/10 text-[var(--navy)]",
            )}
            aria-hidden
          >
            ✓
          </span>
          {text}
        </li>
      ))}
    </ul>
  );
}

/** 淡い注意ボックス */
export function InfoCallout({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-navy-tint)] px-4 py-3.5 sm:px-5 sm:py-4">
      <p className="text-[13px] font-semibold text-[var(--text-primary)] sm:text-sm">
        {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-[12px] leading-relaxed text-[var(--text-body)] sm:text-[13px]"
          >
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--navy)]/40" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

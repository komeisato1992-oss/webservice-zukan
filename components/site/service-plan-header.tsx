import Link from "next/link";
import {
  formatPlanLabel,
  resolveServiceNameLines,
} from "@/lib/site/service-name-display";
import { ServiceLogo } from "@/components/site/service-logo";
import { cn } from "@/components/site/ui";

type Tone = "dark" | "light";
type Size = "sm" | "md";

type Props = {
  serviceName: string;
  planName?: string | null;
  /** 表示名オーバーライド（空なら planName から生成） */
  planDisplayName?: string | null;
  logoUrl?: string | null;
  href?: string;
  tone?: Tone;
  size?: Size;
  showLogo?: boolean;
  /** false のときプラン名行を出さない（PlanSwitcher と重複させない） */
  showPlan?: boolean;
  className?: string;
};

const sizeStyles: Record<
  Size,
  {
    service: string;
    plan: string;
    nameMinH: string;
    planMinH: string;
    logo: "sm" | "md";
    gap: string;
    rule: string;
  }
> = {
  sm: {
    service:
      "text-[11px] font-bold leading-[1.2] tracking-tight sm:text-[12px] sm:leading-[1.25]",
    plan: "text-[10px] font-normal leading-[1.2] sm:text-[11px] sm:leading-[1.25]",
    nameMinH: "min-h-0",
    planMinH: "min-h-0",
    logo: "sm",
    gap: "gap-0.5 sm:gap-1",
    rule: "h-px w-5 sm:w-6",
  },
  md: {
    service:
      "text-[11px] font-bold leading-[1.2] tracking-tight sm:text-[15px] sm:leading-[1.25] sm:tracking-normal",
    plan: "text-[10px] font-normal leading-[1.2] sm:text-[12px] sm:leading-[1.25]",
    nameMinH: "min-h-0 sm:min-h-[2.5em]",
    planMinH: "min-h-0 sm:min-h-[2.5em]",
    logo: "sm",
    gap: "gap-0.5 sm:gap-1.5",
    rule: "h-px w-5 sm:w-6",
  },
};

/**
 * サービス名（上寄せ・最大2行）＋ プラン名（「プラン」付与）の共通ヘッダー。
 */
export function ServicePlanHeader({
  serviceName,
  planName,
  planDisplayName,
  logoUrl,
  href,
  tone = "dark",
  size = "md",
  showLogo = true,
  showPlan = true,
  className,
}: Props) {
  const lines = resolveServiceNameLines(serviceName);
  const plan = showPlan ? formatPlanLabel(planName, planDisplayName) : null;
  const s = sizeStyles[size];
  const serviceColor = tone === "dark" ? "text-white" : "text-[var(--text-primary)]";
  const planColor =
    tone === "dark" ? "text-white/75" : "text-[var(--text-muted)]";
  const ruleColor =
    tone === "dark" ? "bg-white/35" : "bg-[var(--border)]";

  const body = (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center",
        s.gap,
        className,
      )}
    >
      {showLogo ? (
        <ServiceLogo
          name={serviceName}
          logoUrl={logoUrl}
          size={s.logo}
          fallback="none"
          className={
            size === "sm"
              ? "!h-6 !w-6 sm:!h-8 sm:!w-8"
              : "!h-6 !w-6 sm:!h-8 sm:!w-8"
          }
        />
      ) : null}

      {/* サービス名領域：全列で同じ開始位置・高さ */}
      <div
        className={cn(
          "flex w-full flex-col items-center justify-start px-0.5 text-center sm:px-0",
          s.nameMinH,
          s.service,
          serviceColor,
        )}
      >
        {lines.map((line, i) => (
          <span
            key={`${line}-${i}`}
            className="block max-w-full jp-keep whitespace-nowrap tracking-tight"
          >
            {line}
          </span>
        ))}
      </div>

      {plan ? (
        <>
          <span
            className={cn("mx-auto shrink-0", s.rule, ruleColor)}
            aria-hidden
          />
          <div
            className={cn(
              "flex w-full flex-col items-center justify-start px-0.5 text-center sm:px-0",
              s.planMinH,
              s.plan,
              planColor,
            )}
          >
            <span className="jp-keep line-clamp-2 break-words text-balance [overflow-wrap:anywhere]">
              {plan}
            </span>
          </div>
        </>
      ) : showPlan ? (
        <div className={cn("w-full", s.planMinH)} aria-hidden />
      ) : (
        <span
          className={cn("mx-auto shrink-0", s.rule, ruleColor)}
          aria-hidden
        />
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "mx-auto flex h-full w-full flex-col focus-visible:outline-none focus-visible:ring-2",
          tone === "dark"
            ? "focus-visible:ring-white/50"
            : "focus-visible:ring-[var(--accent)]/35",
        )}
      >
        {body}
      </Link>
    );
  }

  return body;
}

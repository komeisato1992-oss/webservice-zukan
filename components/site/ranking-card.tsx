import Link from "next/link";
import type { ManagedRankingCard } from "@/lib/site/rankings-public";
import { categoryPath, resolveOutboundLink } from "@/lib/links";
import { OfficialSiteButton } from "@/components/site/official-site-button";
import { ServiceLogo } from "@/components/site/service-logo";
import { buttonClass, cn } from "@/components/site/ui";

const RANK_MEDAL: Record<1 | 2 | 3, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

function rankFrameClass(rank: 1 | 2 | 3): string {
  if (rank === 1) {
    return "border-[3px] border-[#D4A017] bg-[#FFF9EB]";
  }
  if (rank === 2) {
    return "border-2 border-[#A8B0BC] bg-[#F4F6F8]";
  }
  return "border border-[var(--navy)] bg-white";
}

/** ★評価（0〜5、小数対応）。例: 4.5 → ★★★★☆ */
export function RankingStarRow({ rating }: { rating: number | null }) {
  if (rating == null) {
    return (
      <p className="text-[12px] text-[var(--text-muted)]" aria-label="評価未設定">
        —
      </p>
    );
  }
  const clamped = Math.min(5, Math.max(0, rating));
  const full = Math.floor(clamped);
  const frac = clamped - full;
  const half = frac >= 0.25 && frac < 0.75;
  const extraFull = frac >= 0.75 ? 1 : 0;
  const filled = full + extraFull;
  const stars: string[] = [];
  for (let i = 0; i < 5; i++) {
    if (i < filled) stars.push("★");
    else if (i === filled && half) stars.push("☆");
    else stars.push("☆");
  }
  return (
    <p
      className="text-[13px] leading-none tracking-tight text-amber-500"
      aria-label={`編集部評価 ${clamped}`}
    >
      <span aria-hidden>{stars.join("")}</span>
      <span className="ml-1 text-[11px] tabular-nums text-[var(--text-muted)]">
        {clamped % 1 === 0 ? clamped.toFixed(0) : clamped.toFixed(1)}
      </span>
    </p>
  );
}

type Props = {
  card: ManagedRankingCard;
  categorySlug: string;
  className?: string;
};

/**
 * おすすめランキング / 条件別ランキング共通カード。
 * デザイン変更はここだけで反映する。
 */
export function RankingCard({ card, categorySlug, className }: Props) {
  const detailHref = categoryPath(
    categorySlug,
    "services",
    card.service.slug,
  );
  const outbound = resolveOutboundLink(card.service, card.affiliateLinks);
  const rank = card.rank;

  return (
    <article
      className={cn(
        "flex h-full min-h-[18.5rem] w-[15.5rem] shrink-0 flex-col rounded-[var(--radius-card)] px-3.5 py-3 sm:w-auto sm:min-w-0",
        rankFrameClass(rank),
        className,
      )}
    >
      <p className="text-[12px] font-bold tabular-nums text-[var(--text-primary)]">
        <span aria-hidden className="mr-1">
          {RANK_MEDAL[rank]}
        </span>
        {rank}位
      </p>

      <div className="mt-2 flex justify-center">
        <ServiceLogo
          name={card.service.name}
          logoUrl={card.service.logo_url}
          size="sm"
          fallback="icon"
        />
      </div>

      <h3 className="mt-2 text-center text-[18px] font-extrabold leading-snug tracking-tight text-[var(--text-primary)] sm:text-[19px]">
        <span className="jp-break">{card.service.name}</span>
      </h3>

      {card.planName ? (
        <p className="mt-0.5 text-center text-[11px] text-[var(--text-muted)]">
          {card.planName}
        </p>
      ) : (
        <p className="mt-0.5 text-center text-[11px] text-transparent" aria-hidden>
          —
        </p>
      )}

      <div className="mt-1.5 flex justify-center">
        <RankingStarRow rating={card.rating} />
      </div>

      <p className="mt-1.5 line-clamp-4 min-h-[5.6em] text-center text-[12px] leading-[1.4] text-[var(--text-body)]">
        {card.cardComment || "\u00A0"}
      </p>

      <div className="mt-2 text-center">
        <p className="text-[10px] text-[var(--text-muted)]">月額料金</p>
        <p className="mt-0.5 text-[16px] font-bold tabular-nums text-[var(--navy)]">
          {card.monthlyLabel}
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-1.5 pt-3">
        {outbound ? (
          <OfficialSiteButton
            href={outbound.href}
            isAffiliate={outbound.isAffiliate}
            label="公式サイトを見る"
            size="sm"
          />
        ) : (
          <span
            className={cn(
              buttonClass("secondary", "sm"),
              "pointer-events-none w-full opacity-40",
            )}
          >
            公式サイトを見る
          </span>
        )}
        <Link
          href={detailHref}
          className={cn(buttonClass("secondary", "sm"), "w-full")}
        >
          詳細を見る
        </Link>
      </div>
    </article>
  );
}

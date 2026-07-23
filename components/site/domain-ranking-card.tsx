import Link from "next/link";
import { categoryPath, resolveOutboundLink } from "@/lib/links";
import type { ManagedRankingCard } from "@/lib/site/rankings-public";
import { DomainServiceLogo } from "@/components/site/domain-service-logo";
import { OfficialSiteButton } from "@/components/site/official-site-button";
import { RankingStarRow } from "@/components/site/ranking-card";
import { buttonClass, cn } from "@/components/site/ui";

const RANK_MEDAL: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

function rankFrameClass(rank: number): string {
  if (rank === 1) return "border-[3px] border-[#D4A017] bg-[#FFF9EB]";
  if (rank === 2) return "border-2 border-[#A8B0BC] bg-[#F4F6F8]";
  if (rank === 3) return "border border-[var(--navy)] bg-white";
  return "border border-[var(--border)] bg-white";
}

type Props = {
  card: ManagedRankingCard;
  categorySlug: string;
  buttonLocation: string;
  className?: string;
};

/** ドメイン図鑑向けランキングカード（月額指標なし） */
export function DomainRankingCard({
  card,
  categorySlug,
  buttonLocation,
  className,
}: Props) {
  const detailHref = categoryPath(
    categorySlug,
    "services",
    card.service.slug,
  );
  const outbound = resolveOutboundLink(card.service, card.affiliateLinks);
  const rank = card.rank;
  const medal = RANK_MEDAL[rank];

  return (
    <article
      className={cn(
        "flex h-full min-h-[16.5rem] w-[min(86vw,18rem)] shrink-0 flex-col rounded-[var(--radius-card)] px-3.5 py-3 sm:w-full sm:min-w-0 sm:shrink",
        rankFrameClass(rank),
        className,
      )}
    >
      <p className="text-[12px] font-bold tabular-nums text-[var(--text-primary)]">
        {medal ? (
          <span aria-hidden className="mr-1">
            {medal}
          </span>
        ) : null}
        {rank}位
      </p>

      <div className="mt-2.5 flex h-16 w-full items-center justify-center">
        <DomainServiceLogo
          name={card.service.name}
          slug={card.service.slug}
          variant="ranking"
          className="mx-auto"
        />
      </div>

      <h3 className="mt-1.5 min-h-[2.5em] text-center text-[13px] font-bold leading-snug text-[var(--text-primary)]">
        <span className="jp-break">{card.service.name}</span>
      </h3>

      <div className="mt-2 flex justify-center">
        <RankingStarRow rating={card.rating} />
      </div>

      <p className="mt-2 line-clamp-3 min-h-[4.2em] text-center text-[12px] leading-[1.4] text-[var(--text-body)]">
        {card.cardComment || "\u00A0"}
      </p>

      <div className="mt-auto flex flex-col gap-1.5 pt-3">
        {outbound ? (
          <OfficialSiteButton
            href={outbound.href}
            isAffiliate={outbound.isAffiliate}
            label="公式サイトを見る"
            size="sm"
            analytics={{
              service_name: card.service.name,
              page_type: "top",
              button_location: buttonLocation,
              ranking_type: card.purposeId,
              position: card.rank,
            }}
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
          className={cn(buttonClass("secondary", "sm"), "w-full min-h-11")}
        >
          詳細を見る
        </Link>
      </div>
    </article>
  );
}

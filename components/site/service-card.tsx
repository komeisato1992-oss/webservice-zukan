import Link from "next/link";
import type { AffiliateLink, Service, ServicePlan } from "@/lib/types/database";
import { categoryPath, resolveOutboundLink } from "@/lib/links";
import { formatPrice, formatStorage } from "@/lib/types/comparison";
import { DOMAIN_CATEGORY_SLUG } from "@/lib/site/domain-brand";
import { DomainServiceLogo } from "@/components/site/domain-service-logo";
import { ServiceLogo } from "@/components/site/service-logo";
import { OfficialSiteButton } from "@/components/site/official-site-button";
import { RankCornerBadge, SiteBadge } from "@/components/site/site-badge";
import { AddToCompareButton } from "@/components/site/compare/add-to-compare-button";
import { formatPlanLabelFromPlan } from "@/lib/site/service-name-display";
import { FeatureTag, SiteCard, buttonClass, cn } from "@/components/site/ui";

type Props = {
  service: Service;
  categorySlug: string;
  affiliateLinks?: AffiliateLink[];
  outboundUrl?: string | null;
  representativePlan?: ServicePlan | null;
  featureTags?: string[];
  className?: string;
  rank?: number | null;
  featured?: boolean;
  /** GA4 affiliate_click の page_type */
  pageType?: string;
  /** GA4 affiliate_click の button_location */
  buttonLocation?: string;
};

function priceLabel(plan: ServicePlan | null | undefined): string | null {
  if (!plan) return null;
  const price =
    plan.effective_monthly_price ??
    plan.campaign_monthly_price ??
    plan.regular_monthly_price;
  if (price == null) return null;
  return `${formatPrice(price)}/月`;
}

export function ServiceCard({
  service,
  categorySlug,
  affiliateLinks = [],
  outboundUrl,
  representativePlan = null,
  featureTags = [],
  className = "",
  rank = null,
  featured = false,
  pageType = "services",
  buttonLocation = "service_card",
}: Props) {
  const detailHref = categoryPath(categorySlug, "services", service.slug);
  const outbound =
    resolveOutboundLink(service, affiliateLinks) ??
    (outboundUrl ? { href: outboundUrl, isAffiliate: true } : null);
  const price = priceLabel(representativePlan);
  const storage =
    representativePlan && representativePlan.storage_value != null
      ? formatStorage(
          representativePlan.storage_value,
          representativePlan.storage_unit,
        )
      : null;
  const tags = featureTags.slice(0, 3);
  const suitedFor = service.recommended_uses?.trim() || null;
  const shortFeature = service.catchphrase?.trim() || null;
  const showRank = rank != null && rank >= 1 && rank <= 3;
  const isDomain = categorySlug === DOMAIN_CATEGORY_SLUG;

  return (
    <SiteCard
      className={cn(
        "relative flex h-full flex-col !p-3.5 sm:!p-4",
        featured && "ring-1 ring-[var(--navy)]/15 shadow-[var(--shadow-featured)]",
        className,
      )}
      hover
    >
      {showRank ? (
        <RankCornerBadge rank={rank} className="absolute left-2.5 top-2.5 z-10" />
      ) : null}

      <div className={cn("flex items-start gap-2.5", showRank && "pt-1 pl-7")}>
        {isDomain ? (
          <Link
            href={detailHref}
            className="mt-0.5 w-[min(100%,190px)] max-w-[42%] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35"
            aria-label={`${service.name}の詳細`}
          >
            <DomainServiceLogo
              name={service.name}
              slug={service.slug}
              variant="default"
            />
          </Link>
        ) : (
          <Link
            href={detailHref}
            className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35"
            aria-label={`${service.name}の詳細`}
          >
            <ServiceLogo
              name={service.name}
              logoUrl={service.logo_url}
              size={featured ? "lg" : "md"}
              fallback="none"
            />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2
              className={cn(
                "font-bold leading-snug text-[var(--text-primary)] text-pretty",
                featured
                  ? "text-[16px] sm:text-[17px]"
                  : "text-[15px]",
              )}
            >
              <Link
                href={detailHref}
                className="hover:text-[var(--accent)] jp-break break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35"
              >
                {service.name}
              </Link>
            </h2>
            {service.is_featured ? (
              <SiteBadge variant="featured" />
            ) : null}
          </div>
          {shortFeature ? (
            <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[var(--text-body)]">
              {shortFeature}
            </p>
          ) : null}
          {price ? (
            <p
              className={cn(
                "mt-1.5 font-bold tabular-nums text-[var(--text-primary)]",
                featured ? "text-lg" : "text-base",
              )}
            >
              {price}
            </p>
          ) : null}
        </div>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[var(--text-body)]">
        {representativePlan?.name ? (
          <div className="flex gap-1">
            <dt className="text-[var(--text-muted)]">プラン</dt>
            <dd className="max-w-[10rem] break-words font-medium text-[var(--text-primary)]">
              {formatPlanLabelFromPlan(representativePlan)}
            </dd>
          </div>
        ) : null}
        {storage ? (
          <div className="flex gap-1">
            <dt className="text-[var(--text-muted)]">容量</dt>
            <dd className="font-medium text-[var(--text-primary)]">{storage}</dd>
          </div>
        ) : null}
      </dl>

      {tags.length > 0 ? (
        <ul className="mt-2.5 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <li key={tag}>
              <FeatureTag>{tag}</FeatureTag>
            </li>
          ))}
        </ul>
      ) : null}

      {suitedFor ? (
        <p className="mt-2.5 line-clamp-1 text-[11px] leading-snug text-[var(--text-body)]">
          <span className="font-medium text-[var(--navy)]">向いている人：</span>
          {suitedFor}
        </p>
      ) : null}

      <div className="mt-auto flex flex-col gap-1.5 pt-3">
        <AddToCompareButton
          slug={service.slug}
          name={service.name}
          categorySlug={categorySlug}
          emphasis="primary"
        />
        <div className="flex items-center gap-2">
          <Link
            href={detailHref}
            className={`${buttonClass("secondary", "sm")} flex-1`}
          >
            特徴・料金を見る
          </Link>
          {outbound ? (
            <OfficialSiteButton
              href={outbound.href}
              isAffiliate={outbound.isAffiliate}
              label="公式"
              size="sm"
              fullWidth={false}
              className="min-w-[5.25rem] px-2"
              analytics={{
                service_name: service.name,
                page_type: pageType,
                button_location: buttonLocation,
                ...(rank != null ? { position: rank } : {}),
              }}
            />
          ) : null}
        </div>
      </div>
    </SiteCard>
  );
}

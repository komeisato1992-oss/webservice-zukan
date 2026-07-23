import Link from "next/link";
import { categoryPath, resolveOutboundLink } from "@/lib/links";
import type { EnrichedService } from "@/lib/site/service-utils";
import { DomainServiceLogo } from "@/components/site/domain-service-logo";
import { OfficialSiteButton } from "@/components/site/official-site-button";
import { FeatureTag, SiteCard, buttonClass, cn } from "@/components/site/ui";

type Props = {
  item: EnrichedService;
  categorySlug: string;
};

export function DomainServiceCard({ item, categorySlug }: Props) {
  const { service, affiliateLinks, highlightLabels } = item;
  const detailHref = categoryPath(categorySlug, "services", service.slug);
  const outbound = resolveOutboundLink(service, affiliateLinks);
  const summary =
    service.catchphrase?.trim() ||
    service.recommended_uses?.trim() ||
    null;
  const tags = (highlightLabels?.length
    ? highlightLabels
    : (service.recommended_uses ?? "")
        .split(/[、,]/)
        .map((t) => t.trim())
        .filter(Boolean)
  ).slice(0, 2);

  return (
    <SiteCard
      className="relative flex h-full flex-col !p-3 sm:!p-3.5"
      hover
    >
      <div className="flex items-start gap-2.5">
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
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-bold leading-snug text-[var(--text-primary)] sm:text-[14px]">
            <Link
              href={detailHref}
              className="hover:text-[var(--navy)] focus-visible:outline-none"
            >
              <span className="jp-break">{service.name}</span>
            </Link>
          </h3>
          {summary ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[var(--text-body)] sm:text-[12px]">
              {summary}
            </p>
          ) : null}
        </div>
      </div>

      {tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <FeatureTag key={tag}>{tag}</FeatureTag>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex flex-col gap-1.5 pt-3">
        {outbound ? (
          <OfficialSiteButton
            href={outbound.href}
            isAffiliate={outbound.isAffiliate}
            label="公式サイトを見る"
            size="sm"
            analytics={{
              service_name: service.name,
              page_type: "top",
              button_location: "domain_service_card",
            }}
          />
        ) : null}
        <Link
          href={detailHref}
          className={cn(buttonClass("secondary", "sm"), "w-full min-h-11")}
        >
          詳細を見る
        </Link>
      </div>
    </SiteCard>
  );
}

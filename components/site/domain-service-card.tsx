import Link from "next/link";
import { categoryPath, resolveOutboundLink } from "@/lib/links";
import type { EnrichedService } from "@/lib/site/service-utils";
import { DomainServiceLogo } from "@/components/site/domain-service-logo";
import { OfficialSiteButton } from "@/components/site/official-site-button";
import { SiteCard, buttonClass, cn } from "@/components/site/ui";

type Props = {
  item: EnrichedService;
  categorySlug: string;
};

/**
 * ドメイン図鑑TOP「サービス一覧」カード。
 * 文章は管理画面のキャッチコピー（services.catchphrase）のみ表示。
 */
export function DomainServiceCard({ item, categorySlug }: Props) {
  const { service, affiliateLinks } = item;
  const detailHref = categoryPath(categorySlug, "services", service.slug);
  const outbound = resolveOutboundLink(service, affiliateLinks);
  const catchphrase = service.catchphrase?.trim() || null;

  return (
    <SiteCard
      className="relative flex h-full flex-col !p-3 sm:!p-3.5"
      hover
    >
      <Link
        href={detailHref}
        className="block w-full shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35"
        aria-label={`${service.name}の詳細`}
      >
        <DomainServiceLogo
          name={service.name}
          slug={service.slug}
          logoUrl={service.logo_url}
          variant="default"
          className="max-w-none"
        />
      </Link>

      <h3 className="mt-2.5 text-[13px] font-bold leading-snug text-[var(--text-primary)] sm:text-[14px]">
        <Link
          href={detailHref}
          className="hover:text-[var(--navy)] focus-visible:outline-none"
        >
          <span className="jp-break">{service.name}</span>
        </Link>
      </h3>

      {catchphrase ? (
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[var(--text-muted)] sm:text-[12px]">
          {catchphrase}
        </p>
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

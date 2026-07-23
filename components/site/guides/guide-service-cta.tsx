import { resolveOutboundLink } from "@/lib/links";
import type { EnrichedService } from "@/lib/site/service-utils";
import { OfficialSiteButton } from "@/components/site/official-site-button";

type Props = {
  item: EnrichedService | undefined;
  location: string;
};

export function GuideServiceCta({ item, location }: Props) {
  if (!item) return null;
  const outbound = resolveOutboundLink(item.service, item.affiliateLinks);
  if (!outbound) return null;

  return (
    <div className="mt-3 max-w-xs">
      <OfficialSiteButton
        href={outbound.href}
        isAffiliate={outbound.isAffiliate}
        label="公式サイトを見る"
        size="md"
        fullWidth
        analytics={{
          service_name: item.service.name,
          page_type: "guide",
          button_location: location,
        }}
      />
    </div>
  );
}

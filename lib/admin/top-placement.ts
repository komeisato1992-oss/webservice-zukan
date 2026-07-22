import {
  AFFILIATE_STATUS_LABELS,
  formatAffiliateAspLabel,
  normalizeAffiliateNetwork,
  normalizeAffiliateStatus,
} from "@/lib/site/affiliate";
import type { AffiliateLink, ServiceStatus } from "@/lib/types/database";

export type TopPlacementServiceRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  status: ServiceStatus;
  is_published: boolean;
  is_featured: boolean;
  show_in_top_featured_comparison: boolean;
  show_in_top_comparison: boolean;
  top_featured_display_order: number | null;
  top_comparison_display_order: number | null;
  updated_at: string;
  categoryName: string;
  aspLabel: string;
};

type TopPlacementServiceInput = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  status: ServiceStatus;
  is_published: boolean;
  is_featured: boolean;
  show_in_top_featured_comparison?: boolean | null;
  show_in_top_comparison?: boolean | null;
  top_featured_display_order?: number | null;
  top_comparison_display_order?: number | null;
  updated_at: string;
  affiliate_url?: string | null;
  affiliate_network?: string | null;
  affiliate_status?: string | null;
  categories?: { name?: string } | null;
  affiliate_links?: AffiliateLink[] | null;
};

function resolveAspLabel(service: TopPlacementServiceInput): string {
  if (
    service.affiliate_url != null ||
    service.affiliate_network != null ||
    service.affiliate_status != null
  ) {
    return formatAffiliateAspLabel({
      affiliate_url: service.affiliate_url,
      affiliate_network: service.affiliate_network,
      affiliate_status: service.affiliate_status,
    });
  }

  // レガシー affiliate_links フォールバック
  const links = service.affiliate_links ?? [];
  const primary = links.find((l) => l.is_primary) ?? links[0];
  if (!primary) return "未設定";
  const network = primary.asp_name?.trim() || "未設定";
  const status =
    primary.approval_status === "approved"
      ? AFFILIATE_STATUS_LABELS.active
      : primary.approval_status === "pending"
        ? AFFILIATE_STATUS_LABELS.pending
        : AFFILIATE_STATUS_LABELS.inactive;
  if (!primary.affiliate_url?.trim() && status === AFFILIATE_STATUS_LABELS.inactive) {
    return "未設定";
  }
  return `${network} · ${status}`;
}

export function toTopPlacementRows(
  services: TopPlacementServiceInput[],
): TopPlacementServiceRow[] {
  return services.map((service) => ({
    id: service.id,
    name: service.name,
    slug: service.slug,
    logo_url: service.logo_url,
    status: service.status,
    is_published: service.is_published,
    is_featured: service.is_featured,
    show_in_top_featured_comparison: Boolean(
      service.show_in_top_featured_comparison,
    ),
    show_in_top_comparison: Boolean(service.show_in_top_comparison),
    top_featured_display_order: service.top_featured_display_order ?? null,
    top_comparison_display_order:
      service.top_comparison_display_order ?? null,
    updated_at: service.updated_at,
    categoryName: service.categories?.name ?? "-",
    aspLabel: resolveAspLabel(service),
  }));
}

export { normalizeAffiliateNetwork, normalizeAffiliateStatus };

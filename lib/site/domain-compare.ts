import {
  DOMAIN_COMPARISON_ITEM_DEFS,
  DOMAIN_COMPARISON_GROUP_LABELS,
  DOMAIN_COMPARISON_GROUP_ORDER,
  type DomainComparisonGroupKey,
} from "@/lib/admin/domain-comparison-items";
import type {
  DomainComparisonItem,
  DomainFeatureStatus,
  DomainServiceDetails,
  Service,
} from "@/lib/types/database";
import type { EnrichedService } from "@/lib/site/service-utils";
import type { ManagedRankingCard } from "@/lib/site/rankings-public";

export type DomainPriceKind = "registration" | "renewal" | "transfer";

export const DOMAIN_PRICE_KIND_TABS: Array<{
  kind: DomainPriceKind;
  label: string;
}> = [
  { kind: "registration", label: "取得料金" },
  { kind: "renewal", label: "更新料金" },
  { kind: "transfer", label: "移管料金" },
];

/** item_key → domain_service_details カラム */
export const DOMAIN_ITEM_KEY_TO_DETAIL_FIELD: Record<
  string,
  keyof DomainServiceDetails
> = {
  com_registration: "com_registration_price",
  com_renewal: "com_renewal_price",
  com_transfer: "com_transfer_price",
  jp_registration: "jp_registration_price",
  jp_renewal: "jp_renewal_price",
  jp_transfer: "jp_transfer_price",
  co_jp_registration: "co_jp_registration_price",
  co_jp_renewal: "co_jp_renewal_price",
  co_jp_transfer: "co_jp_transfer_price",
  net_registration: "net_registration_price",
  net_renewal: "net_renewal_price",
  net_transfer: "net_transfer_price",
  whois_privacy: "whois_privacy_status",
  dns: "dns_status",
  dnssec: "dnssec_status",
  auto_renewal: "auto_renewal_status",
  domain_transfer: "transfer_status",
  japanese_domain: "japanese_domain_status",
  phone_support: "phone_support_status",
  email_support: "email_support_status",
  chat_support: "chat_support_status",
  free_domain_benefit: "free_domain_benefit",
  server_bundle_benefit: "server_bundle_benefit",
};

export type DomainCompareItemView = {
  item_key: string;
  group_key: DomainComparisonGroupKey;
  display_name: string;
  is_visible: boolean;
  sort_order: number;
  highlight_best: boolean;
  tld_label: string | null;
  price_kind: DomainPriceKind | null;
};

const TLD_LABEL_BY_PREFIX: Record<string, string> = {
  com: ".com",
  jp: ".jp",
  co_jp: ".co.jp",
  net: ".net",
};

export function parseDomainPriceItemKey(itemKey: string): {
  tldPrefix: string;
  tldLabel: string;
  priceKind: DomainPriceKind;
} | null {
  const m = itemKey.match(/^(com|jp|co_jp|net)_(registration|renewal|transfer)$/);
  if (!m) return null;
  const tldPrefix = m[1];
  const priceKind = m[2] as DomainPriceKind;
  return {
    tldPrefix,
    tldLabel: TLD_LABEL_BY_PREFIX[tldPrefix] ?? `.${tldPrefix}`,
    priceKind,
  };
}

/**
 * DB の比較項目設定を優先し、未取得時は定義テーブルへフォールバック。
 * ハードコードだけで表示を決めない（DB があれば常に DB 優先）。
 */
export function mergeDomainComparisonItems(
  rows: DomainComparisonItem[] | null | undefined,
): DomainCompareItemView[] {
  const byKey = new Map((rows ?? []).map((r) => [r.item_key, r]));
  const views: DomainCompareItemView[] = [];

  for (const def of DOMAIN_COMPARISON_ITEM_DEFS) {
    const row = byKey.get(def.item_key);
    const parsed = parseDomainPriceItemKey(def.item_key);
    views.push({
      item_key: def.item_key,
      group_key: (row?.group_key ?? def.group_key) as DomainComparisonGroupKey,
      display_name: row?.display_name ?? def.display_name,
      is_visible: row?.is_visible ?? def.is_visible,
      sort_order: row?.sort_order ?? def.sort_order,
      highlight_best: row?.highlight_best ?? def.highlight_best,
      tld_label: def.tld_label ?? parsed?.tldLabel ?? null,
      price_kind: parsed?.priceKind ?? null,
    });
  }

  // 定義に無い DB 行があれば末尾に追加
  for (const row of rows ?? []) {
    if (views.some((v) => v.item_key === row.item_key)) continue;
    const parsed = parseDomainPriceItemKey(row.item_key);
    views.push({
      item_key: row.item_key,
      group_key: row.group_key,
      display_name: row.display_name,
      is_visible: row.is_visible,
      sort_order: row.sort_order,
      highlight_best: row.highlight_best,
      tld_label: parsed?.tldLabel ?? null,
      price_kind: parsed?.priceKind ?? null,
    });
  }

  return views.sort((a, b) => {
    const gi =
      DOMAIN_COMPARISON_GROUP_ORDER.indexOf(a.group_key) -
      DOMAIN_COMPARISON_GROUP_ORDER.indexOf(b.group_key);
    if (gi !== 0) return gi;
    return a.sort_order - b.sort_order;
  });
}

export function formatDomainPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  return `${new Intl.NumberFormat("ja-JP").format(n)}円`;
}

export function formatDomainStatus(
  status: DomainFeatureStatus | string | null | undefined,
): { text: string; tone: "ok" | "ng" | "partial" | "empty" } {
  if (status == null || status === "") {
    return { text: "—", tone: "empty" };
  }
  if (status === "supported") return { text: "○", tone: "ok" };
  if (status === "unsupported") return { text: "×", tone: "ng" };
  if (status === "conditional" || status === "partial") {
    return { text: "△", tone: "partial" };
  }
  return { text: "—", tone: "empty" };
}

export function getDomainDetailValue(
  details: DomainServiceDetails | null | undefined,
  itemKey: string,
): number | string | null {
  if (!details) return null;
  const field = DOMAIN_ITEM_KEY_TO_DETAIL_FIELD[itemKey];
  if (!field) return null;
  const raw = details[field];
  if (raw == null) return null;
  if (typeof raw === "number" || typeof raw === "string") return raw;
  return null;
}

/**
 * 比較表初期表示サービス（最大5社）
 * 1. 総合おすすめランキング順位
 * 2. display_order
 * 3. updated_at（新しい順）
 */
export function pickDomainCompareServices(
  services: EnrichedService[],
  overallItems: ManagedRankingCard[] = [],
  limit = 5,
): EnrichedService[] {
  const byId = new Map(services.map((s) => [s.service.id, s]));
  const picked: EnrichedService[] = [];
  const seen = new Set<string>();

  const ranked = [...overallItems].sort((a, b) => a.rank - b.rank);
  for (const card of ranked) {
    const hit = byId.get(card.service.id);
    if (!hit || seen.has(hit.service.id)) continue;
    picked.push(hit);
    seen.add(hit.service.id);
    if (picked.length >= limit) return picked;
  }

  const rest = services
    .filter((s) => !seen.has(s.service.id))
    .sort((a, b) => {
      const d = a.service.display_order - b.service.display_order;
      if (d !== 0) return d;
      return b.service.updated_at.localeCompare(a.service.updated_at);
    });

  for (const s of rest) {
    picked.push(s);
    if (picked.length >= limit) break;
  }
  return picked;
}

export function visibleItemsForGroup(
  items: DomainCompareItemView[],
  group: DomainComparisonGroupKey,
): DomainCompareItemView[] {
  return items
    .filter((i) => i.group_key === group && i.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function visiblePriceRowsForKind(
  items: DomainCompareItemView[],
  kind: DomainPriceKind,
): DomainCompareItemView[] {
  return visibleItemsForGroup(items, "price").filter(
    (i) => i.price_kind === kind,
  );
}

/**
 * 最安判定。null は除外。正式な 0 は候補に含める。
 */
export function findCheapestServiceIds(
  valuesByServiceId: Record<string, number | null>,
): Set<string> {
  const entries = Object.entries(valuesByServiceId).filter(
    ([, v]) => v != null && !Number.isNaN(Number(v)),
  ) as Array<[string, number]>;
  if (entries.length === 0) return new Set();
  const min = Math.min(...entries.map(([, v]) => v));
  return new Set(entries.filter(([, v]) => v === min).map(([id]) => id));
}

export { DOMAIN_COMPARISON_GROUP_LABELS, DOMAIN_COMPARISON_GROUP_ORDER };

export type DomainCompareServiceColumn = {
  service: Pick<
    Service,
    | "id"
    | "name"
    | "slug"
    | "logo_url"
    | "official_url"
    | "affiliate_url"
    | "primary_link_url"
  >;
  affiliateLinks: EnrichedService["affiliateLinks"];
  details: DomainServiceDetails | null;
};

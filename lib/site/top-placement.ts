import type { EnrichedService } from "@/lib/site/service-utils";

export const TOP_FEATURED_COMPARISON_MAX = 3;
export const TOP_COMPARISON_MAX = 10;
export const TOP_COMPARISON_FALLBACK_MAX = 5;

/** 総合評価 → 掲載順 → サービス名 */
export function sortForTopFallback(
  services: EnrichedService[],
): EnrichedService[] {
  return [...services].sort((a, b) => {
    const sa = a.service.editor_score;
    const sb = b.service.editor_score;
    if (sa != null && sb != null && sa !== sb) return sb - sa;
    if (sa != null && sb == null) return -1;
    if (sa == null && sb != null) return 1;
    if (a.service.display_order !== b.service.display_order) {
      return a.service.display_order - b.service.display_order;
    }
    return a.service.name.localeCompare(b.service.name, "ja");
  });
}

function byPlacementOrder(
  services: EnrichedService[],
  orderKey: "top_featured_display_order" | "top_comparison_display_order",
): EnrichedService[] {
  return [...services].sort((a, b) => {
    const oa = a.service[orderKey];
    const ob = b.service[orderKey];
    if (oa != null && ob != null && oa !== ob) return oa - ob;
    if (oa != null && ob == null) return -1;
    if (oa == null && ob != null) return 1;
    if (a.service.display_order !== b.service.display_order) {
      return a.service.display_order - b.service.display_order;
    }
    return a.service.name.localeCompare(b.service.name, "ja");
  });
}

/**
 * 人気3社：管理画面選択を優先。0件のとき公開サービスから最大3件フォールバック。
 * 1件以上明示選択がある場合は自動補完しない。
 */
export function resolveFeaturedComparisonServices(
  services: EnrichedService[],
): EnrichedService[] {
  const selected = byPlacementOrder(
    services.filter((s) => s.service.show_in_top_featured_comparison),
    "top_featured_display_order",
  ).slice(0, TOP_FEATURED_COMPARISON_MAX);

  if (selected.length > 0) return selected;
  return sortForTopFallback(services).slice(0, TOP_FEATURED_COMPARISON_MAX);
}

/**
 * TOP比較：管理画面選択を優先。0件のとき総合評価上位最大5件フォールバック。
 * 1件以上明示選択がある場合は自動補完しない。
 */
export function resolveTopComparisonServices(
  services: EnrichedService[],
): EnrichedService[] {
  const selected = byPlacementOrder(
    services.filter((s) => s.service.show_in_top_comparison),
    "top_comparison_display_order",
  ).slice(0, TOP_COMPARISON_MAX);

  if (selected.length > 0) return selected;
  return sortForTopFallback(services).slice(0, TOP_COMPARISON_FALLBACK_MAX);
}

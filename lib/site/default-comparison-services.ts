import type { EnrichedService } from "@/lib/site/service-utils";
import { resolveTopComparisonServices } from "@/lib/site/top-placement";

/**
 * TOP「おすすめレンタルサーバー徹底比較」と比較ページの
 * デフォルト比較対象を同一ロジックで返す。
 */
export function getDefaultComparisonServices(
  services: EnrichedService[],
): EnrichedService[] {
  return resolveTopComparisonServices(services);
}

export function getDefaultComparisonSlugs(
  services: EnrichedService[],
): string[] {
  return getDefaultComparisonServices(services).map((s) => s.service.slug);
}

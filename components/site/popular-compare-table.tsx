"use client";

import type { ComparisonField } from "@/lib/types/database";
import type { EnrichedService } from "@/lib/site/service-utils";
import { useCompare } from "@/components/site/compare/compare-context";
import { ComparisonTable } from "@/components/site/compare/comparison-table";
import { CompareNavigateLink } from "@/components/site/compare/compare-navigate-link";
import { buttonClass, cn } from "@/components/site/ui";

type Props = {
  categorySlug: string;
  services: EnrichedService[];
  fields: ComparisonField[];
  allSlugs: string[];
};

/**
 * TOP「おすすめレンタルサーバー徹底比較」
 * 管理画面で設定したサービス・プランのみ表示（ユーザー操作で書き換えない）。
 */
export function PopularCompareTable({
  categorySlug,
  services,
  fields,
  allSlugs,
}: Props) {
  const { add, has } = useCompare();
  const displayedSlugs = services.map((s) => s.service.slug);

  if (services.length === 0) {
    return (
      <p className="border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-body)] text-pretty">
        公開中のサービスはまだありません。
      </p>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-2.5">
      <ComparisonTable
        categorySlug={categorySlug}
        services={services}
        fields={fields}
        variant="top"
        tableId="top-comparison-table"
        denseMobile
        compactLabel
        showMobileTips
        onPlanChangeExtra={(serviceId) => {
          const item = services.find((s) => s.service.id === serviceId);
          if (!item || has(item.service.slug)) return;
          add({
            slug: item.service.slug,
            name: item.service.name,
            categorySlug,
          });
        }}
      />

      <div className="flex flex-col items-center gap-1.5 pb-0">
        <CompareNavigateLink
          categorySlug={categorySlug}
          intent="slugs"
          forceSlugs={displayedSlugs}
          className={cn(
            buttonClass("primary", "md"),
            "px-4 text-[12px] whitespace-nowrap font-semibold transition duration-150 sm:min-w-[14rem] sm:text-[13px]",
          )}
        >
          より詳細を比較する →
        </CompareNavigateLink>
        <CompareNavigateLink
          categorySlug={categorySlug}
          intent="all"
          allSlugs={allSlugs}
          className="text-center text-[12px] font-medium text-[var(--text-muted)] transition duration-150 hover:text-[var(--accent)] hover:underline sm:text-[13px] whitespace-nowrap"
        >
          掲載サービスすべてを比較する
        </CompareNavigateLink>
      </div>
    </div>
  );
}

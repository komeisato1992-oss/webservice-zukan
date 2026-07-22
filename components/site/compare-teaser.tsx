"use client";

import { useCompare } from "@/components/site/compare/compare-context";
import { categoryPath } from "@/lib/links";
import { SiteLinkButton } from "@/components/site/ui";

type Props = {
  categorySlug: string;
};

export function CompareTeaser({ categorySlug }: Props) {
  const { items } = useCompare();
  const compareHref =
    items.length > 0
      ? `${categoryPath(categorySlug, "compare")}?slugs=${items
          .map((i) => i.slug)
          .join(",")}`
      : categoryPath(categorySlug, "compare");

  return (
    <div className="flex flex-col gap-4 border-y border-[var(--border)] py-1 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
      <div className="max-w-xl">
        <h2 className="text-[1.25rem] font-bold tracking-tight text-[var(--text-primary)] sm:text-[1.375rem]">
          気になるサーバーを並べて比較
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-muted)] sm:text-sm">
          料金・容量・バックアップ・サポートなどを同じ画面で確認できます。
        </p>
        {items.length > 0 ? (
          <p className="mt-2 text-[13px] font-medium text-[var(--accent)]">
            選択中 {items.length}件：{items.map((i) => i.name).join(" / ")}
          </p>
        ) : (
          <p className="mt-2 text-[12px] text-[var(--text-muted)]">
            「比較に追加」から複数選ぶと、下部に比較バーが表示されます。
          </p>
        )}
      </div>
      <SiteLinkButton href={compareHref} size="md" className="shrink-0">
        比較する
      </SiteLinkButton>
    </div>
  );
}

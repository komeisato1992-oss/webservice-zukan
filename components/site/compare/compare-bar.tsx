"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCompare } from "@/components/site/compare/compare-context";
import { categoryPath } from "@/lib/links";
import { PRIMARY_CATEGORY_SLUG } from "@/lib/site/brand";
import { DOMAIN_CATEGORY_SLUG } from "@/lib/site/domain-brand";
import { buttonClass, ICON_SM } from "@/components/site/ui";

/** 選択中のみ表示する画面下部の固定比較バー（0件時は非表示） */
export function CompareBar() {
  const pathname = usePathname();
  const { items, remove, clear } = useCompare();

  // ドメイン図鑑は TOP 内比較表のみ（比較ページ・比較バーなし）
  if (pathname?.startsWith(`/${DOMAIN_CATEGORY_SLUG}`)) return null;
  if (items.length === 0) return null;

  const categorySlug = items[0]?.categorySlug ?? PRIMARY_CATEGORY_SLUG;
  const compareHref = `${categoryPath(categorySlug, "compare")}?slugs=${items
    .map((i) => i.slug)
    .join(",")}`;
  const first = items[0];
  const rest = items.length - 1;

  return (
    <>
      <div className="h-12 sm:h-14" aria-hidden />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-2.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 sm:px-4">
        <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-2 rounded-[var(--radius-card)] bg-[var(--navy)] px-2.5 py-1.5 text-white shadow-[0_-4px_24px_rgba(9,26,54,0.35)] sm:max-w-xl sm:gap-3 sm:px-3 sm:py-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium text-white/65 sm:text-[11px]">
              比較中 {items.length}件
            </p>
            <p className="truncate text-[12px] font-medium text-white sm:text-[13px]">
              {first?.name}
              {rest > 0 ? (
                <span className="ml-1 font-normal text-white/60">
                  ほか{rest}件
                </span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={clear}
            className="hidden h-8 items-center rounded-md px-2 text-[11px] text-white/70 hover:bg-white/10 sm:inline-flex"
          >
            クリア
          </button>
          <button
            type="button"
            aria-label="最後の選択を外す"
            onClick={() => remove(items[items.length - 1]?.slug ?? "")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X size={ICON_SM} aria-hidden />
          </button>
          <Link
            href={compareHref}
            className={buttonClass("onDark", "sm", "h-9 px-3.5 font-semibold")}
          >
            比較する
          </Link>
        </div>
      </div>
    </>
  );
}

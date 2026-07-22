"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useCompare } from "@/components/site/compare/compare-context";
import { categoryPath } from "@/lib/links";

type Intent = "all" | "picker" | "preserve" | "slugs";

type Props = {
  categorySlug: string;
  /** all: 未選択時は all=1 / picker|preserve: 未選択時はクエリなし / slugs: forceSlugs を使う */
  intent?: Intent;
  /** 公開中の全サービス slug（intent=all のフォールバック） */
  allSlugs?: string[];
  /** intent=slugs または明示指定時に優先する slug 列 */
  forceSlugs?: string[];
  className?: string;
  children: React.ReactNode;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;

/**
 * 比較ページへの導線。
 * forceSlugs 指定時はそのサービスのみを渡す（ユーザー選択より優先）。
 */
export function CompareNavigateLink({
  categorySlug,
  intent = "preserve",
  allSlugs = [],
  forceSlugs,
  className,
  children,
  ...rest
}: Props) {
  const { items } = useCompare();
  const selected = items
    .filter((i) => i.categorySlug === categorySlug)
    .map((i) => i.slug);

  let href = categoryPath(categorySlug, "compare");

  if (forceSlugs && forceSlugs.length > 0) {
    href = `${href}?slugs=${forceSlugs.join(",")}`;
  } else if (intent === "slugs" && forceSlugs && forceSlugs.length > 0) {
    href = `${href}?slugs=${forceSlugs.join(",")}`;
  } else if (selected.length > 0 && intent !== "all") {
    href = `${href}?slugs=${selected.join(",")}`;
  } else if (intent === "all") {
    // URL が長くなりすぎる場合に備え all=1 を使用
    if (allSlugs.length > 12) {
      href = `${href}?all=1`;
    } else if (allSlugs.length > 0) {
      href = `${href}?slugs=${allSlugs.join(",")}`;
    } else {
      href = `${href}?all=1`;
    }
  }
  // intent=picker / preserve で未選択のときはクエリなし

  return (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  );
}

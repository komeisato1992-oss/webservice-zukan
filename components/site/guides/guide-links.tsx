import Link from "next/link";
import { PRIMARY_CATEGORY_SLUG } from "@/lib/site/brand";
import { categoryPath } from "@/lib/links";
import { cn } from "@/components/site/ui";

type Props = {
  slug: string;
  children: React.ReactNode;
  className?: string;
};

/** 記事内のサービス名 → サービス詳細ページ */
export function GuideServiceLink({ slug, children, className }: Props) {
  return (
    <Link
      href={categoryPath(PRIMARY_CATEGORY_SLUG, "services", slug)}
      className={cn(
        "font-medium text-[var(--accent)] underline-offset-2 hover:underline",
        className,
      )}
    >
      {children}
    </Link>
  );
}

type PageLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export function GuidePageLink({ href, children, className }: PageLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "font-medium text-[var(--accent)] underline-offset-2 hover:underline",
        className,
      )}
    >
      {children}
    </Link>
  );
}

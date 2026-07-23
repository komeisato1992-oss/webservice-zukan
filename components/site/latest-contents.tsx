import Link from "next/link";
import type { PublicContentCard } from "@/lib/contents/types";
import { categoryPath } from "@/lib/links";
import { OfficialSiteButton } from "@/components/site/official-site-button";
import { SiteBadge } from "@/components/site/site-badge";
import { buttonClass, cn } from "@/components/site/ui";

type Props = {
  items: PublicContentCard[];
  categorySlug: string;
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function LatestContents({ items, categorySlug }: Props) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-3 sm:gap-4">
      {items.map((item) => {
        const updated = formatDate(item.updatedAt) ?? formatDate(item.publishedAt);
        const expires = formatDate(item.expiresAt);
        const detailHref = item.serviceSlug
          ? categoryPath(categorySlug, "services", item.serviceSlug)
          : categoryPath(categorySlug);
        const official = item.officialUrl || item.sourceUrl;

        return (
          <li
            key={item.id}
            className="flex flex-col rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-3.5 shadow-[var(--shadow-card)] transition duration-150 hover:shadow-[var(--shadow-card-hover)] sm:p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <SiteBadge
                variant={
                  item.contentTypeLabel.includes("キャンペーン")
                    ? "campaign"
                    : item.contentTypeLabel.includes("新着")
                      ? "new"
                      : "featured"
                }
              >
                {item.contentTypeLabel}
              </SiteBadge>
              {item.serviceName ? (
                <span className="text-[11px] text-[var(--text-muted)]">
                  {item.serviceName}
                </span>
              ) : null}
            </div>
            <h3 className="mt-2 text-[14px] font-bold leading-snug text-[var(--text-primary)] sm:text-[15px]">
              {item.title}
            </h3>
            {item.summary ? (
              <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-[var(--text-body)] sm:text-[13px]">
                {item.summary}
              </p>
            ) : null}
            <dl className="mt-2.5 space-y-0.5 text-[11px] text-[var(--text-muted)]">
              {updated ? (
                <div className="flex gap-1.5">
                  <dt>更新</dt>
                  <dd className="tabular-nums text-[var(--text-body)]">
                    {updated}
                  </dd>
                </div>
              ) : null}
              {expires ? (
                <div className="flex gap-1.5">
                  <dt>期限</dt>
                  <dd className="tabular-nums text-[var(--text-body)]">
                    {expires}
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
              <Link
                href={detailHref}
                className={cn(buttonClass("secondary", "sm"), "flex-1")}
              >
                詳細を見る
              </Link>
              {official ? (
                <OfficialSiteButton
                  href={official}
                  isAffiliate={Boolean(item.isAffiliate)}
                  label="公式"
                  size="sm"
                  fullWidth={false}
                  className="min-w-[5.25rem] px-2"
                  analytics={{
                    service_name: item.serviceName ?? item.title,
                    page_type: "top",
                    button_location: "latest_contents",
                  }}
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

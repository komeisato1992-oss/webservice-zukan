import Link from "next/link";
import { TopPlacementEditor } from "@/components/admin/top-placement-editor";
import { toTopPlacementRows } from "@/lib/admin/top-placement";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/cms/status-badge";
import { formatAffiliateAspLabel } from "@/lib/site/affiliate";
import type { AffiliateLink } from "@/lib/types/database";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
    sort?: string;
  }>;
};

const SERVICE_LIST_COLUMNS =
  "id, category_id, name, slug, logo_url, status, is_published, is_site_visible, is_featured, display_order, editor_score, has_unpublished_changes, last_change_source, draft_updated_at, last_published_at, updated_at, show_in_top_featured_comparison, show_in_top_comparison, top_featured_display_order, top_comparison_display_order, affiliate_url, affiliate_network, affiliate_status";

export default async function AdminServicesPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("display_order", { ascending: true });

  let allQuery = supabase
    .from("services")
    .select(
      `${SERVICE_LIST_COLUMNS}, categories(id, name, slug), affiliate_links(id, is_primary, approval_status)`,
    );

  if (params.sort === "name") {
    allQuery = allQuery.order("name", { ascending: true });
  } else if (params.sort === "order") {
    allQuery = allQuery.order("display_order", { ascending: true });
  } else {
    allQuery = allQuery.order("updated_at", { ascending: false });
  }

  const { data: allServicesRaw } = await allQuery;
  const allServices = allServicesRaw ?? [];

  const filtered = allServices.filter((service) => {
    if (params.q) {
      const q = params.q.toLowerCase();
      const hay = `${service.name} ${service.slug}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (params.category && service.category_id !== params.category) {
      return false;
    }
    if (params.status === "published" && !service.is_published) return false;
    if (params.status === "unpublished" && service.is_published) return false;
    if (params.status === "draft_pending" && !service.has_unpublished_changes) {
      return false;
    }
    return true;
  });

  const allRows = toTopPlacementRows(
    allServices.map((s) => ({
      ...s,
      categories: s.categories as { name?: string } | null,
      affiliate_links: (s.affiliate_links as AffiliateLink[]) ?? [],
    })),
  );
  const visibleRows = toTopPlacementRows(
    filtered.map((s) => ({
      ...s,
      categories: s.categories as { name?: string } | null,
      affiliate_links: (s.affiliate_links as AffiliateLink[]) ?? [],
    })),
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">サービス一覧</h1>
          <p className="mt-1 text-sm text-slate-600">
            カードをタップして編集。変更は下書き保存後、「公開へ反映」で本番に出ます。
          </p>
        </div>
        <Link
          href="/admin/services/new"
          className="inline-flex h-12 min-w-[8rem] items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          サービス追加
        </Link>
      </div>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="キーワード検索"
          className="h-12 rounded-lg border border-slate-300 px-3 text-base sm:col-span-2 lg:col-span-1"
        />
        <select
          name="category"
          defaultValue={params.category ?? ""}
          className="h-12 rounded-lg border border-slate-300 px-3 text-base"
        >
          <option value="">すべてのカテゴリ</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="h-12 rounded-lg border border-slate-300 px-3 text-base"
        >
          <option value="">すべての公開状態</option>
          <option value="published">公開中</option>
          <option value="unpublished">非公開</option>
          <option value="draft_pending">未公開の変更あり</option>
        </select>
        <select
          name="sort"
          defaultValue={params.sort ?? "updated"}
          className="h-12 rounded-lg border border-slate-300 px-3 text-base"
        >
          <option value="updated">更新日順</option>
          <option value="name">名前順</option>
          <option value="order">表示順</option>
        </select>
        <button
          type="submit"
          className="h-12 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white sm:col-span-2 lg:col-span-4 lg:w-fit"
        >
          絞り込む
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((service) => {
          const category = service.categories as { name?: string } | null;
          const badgeStatus = service.has_unpublished_changes
            ? "pending_review"
            : service.is_published
              ? "published"
              : service.status === "unpublished"
                ? "unpublished"
                : "draft";
          return (
            <Link
              key={service.id}
              href={`/admin/services/${service.id}`}
              className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/30"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                {service.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={service.logo_url}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400">LOGO</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-semibold text-slate-900">
                    {service.name}
                  </h2>
                  <StatusBadge status={badgeStatus} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {category?.name ?? "—"} · {service.slug}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-700">
                  ASP:{" "}
                  {formatAffiliateAspLabel({
                    affiliate_url: service.affiliate_url,
                    affiliate_network: service.affiliate_network,
                    affiliate_status: service.affiliate_status,
                  })}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span
                    className={`rounded-md px-2 py-0.5 ${
                      (service as { is_site_visible?: boolean }).is_site_visible ===
                      false
                        ? "bg-rose-50 text-rose-800"
                        : "bg-emerald-50 text-emerald-800"
                    }`}
                  >
                    {(service as { is_site_visible?: boolean }).is_site_visible ===
                    false
                      ? "非表示"
                      : "表示中"}
                  </span>
                  {service.has_unpublished_changes ? (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-800">
                      未公開の変更あり
                    </span>
                  ) : null}
                  {service.last_change_source ? (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5">
                      変更元: {service.last_change_source}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          サービスがありません。
        </p>
      ) : null}

      <details className="rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-800">
          TOP掲載サービス設定
        </summary>
        <div className="mt-4">
          <TopPlacementEditor
            allServices={allRows}
            visibleServices={visibleRows}
          />
        </div>
      </details>
    </div>
  );
}

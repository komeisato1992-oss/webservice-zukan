import Link from "next/link";
import { TopPlacementEditor } from "@/components/admin/top-placement-editor";
import { toTopPlacementRows } from "@/lib/admin/top-placement";
import {
  adminDictionaryPath,
  getDictionaryBySlug,
  isFallbackDictionary,
  isKnownDictionarySlug,
} from "@/lib/admin/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/cms/status-badge";
import { formatAffiliateAspLabel } from "@/lib/site/affiliate";
import type { AffiliateLink } from "@/lib/types/database";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ dictionarySlug: string }>;
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
    sort?: string;
  }>;
};

const SERVICE_LIST_COLUMNS =
  "id, category_id, dictionary_id, name, slug, logo_url, status, is_published, is_site_visible, is_featured, display_order, editor_score, has_unpublished_changes, last_change_source, draft_updated_at, last_published_at, updated_at, show_in_top_featured_comparison, show_in_top_comparison, top_featured_display_order, top_comparison_display_order, affiliate_url, affiliate_network, affiliate_status, company_name";

export default async function AdminServicesPage({
  params,
  searchParams,
}: Props) {
  const { dictionarySlug } = await params;
  const queryParams = await searchParams;
  const dictionary = await getDictionaryBySlug(dictionarySlug);
  // 既知図鑑はフォールバック込みで必ず解決する。未解決時のみ404。
  if (!dictionary) {
    if (isKnownDictionarySlug(dictionarySlug)) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center">
          <h1 className="text-lg font-bold text-amber-950">
            図鑑情報を読み込めませんでした
          </h1>
          <p className="mt-2 text-sm text-amber-900/90">
            「{dictionarySlug}」は既知の図鑑ですが、データの取得に失敗しました。
            ページを再読み込みするか、マイグレーション適用状況を確認してください。
          </p>
        </div>
      );
    }
    notFound();
  }
  const isDomain = dictionary.slug === "domain";

  // DB一時障害時は本サイト404に落とさず、管理画面内でエラー表示する
  if (isFallbackDictionary(dictionary)) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center">
        <h1 className="text-lg font-bold text-amber-950">
          図鑑マスタを読み込めませんでした
        </h1>
        <p className="mt-2 text-sm text-amber-900/90">
          dictionaries テーブルの取得に失敗しています。マイグレーション適用と
          Supabase の schema cache 更新後、ページを再読み込みしてください。
        </p>
        {isKnownDictionarySlug(dictionarySlug) ? (
          <p className="mt-3 text-xs text-amber-800">
            対象図鑑: {dictionary.name}（{dictionary.slug}）
          </p>
        ) : null}
      </div>
    );
  }

  const supabase = await createClient();

  const { data: categories } = isDomain
    ? { data: [] as { id: string; name: string; slug: string }[] }
    : await supabase
        .from("categories")
        .select("id, name, slug")
        .order("display_order", { ascending: true });

  let allQuery = supabase
    .from("services")
    .select(
      `${SERVICE_LIST_COLUMNS}, categories(id, name, slug), affiliate_links(id, is_primary, approval_status)`,
    )
    .eq("dictionary_id", dictionary.id);

  if (queryParams.sort === "name") {
    allQuery = allQuery.order("name", { ascending: true });
  } else if (queryParams.sort === "order") {
    allQuery = allQuery.order("display_order", { ascending: true });
  } else {
    allQuery = allQuery.order("updated_at", { ascending: false });
  }

  const { data: allServicesRaw } = await allQuery;
  const allServices = allServicesRaw ?? [];

  const filtered = allServices.filter((service) => {
    if (queryParams.q) {
      const q = queryParams.q.toLowerCase();
      const hay = `${service.name} ${service.slug} ${service.company_name ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (
      !isDomain &&
      queryParams.category &&
      service.category_id !== queryParams.category
    ) {
      return false;
    }
    if (queryParams.status === "published" && !service.is_published) {
      return false;
    }
    if (queryParams.status === "unpublished" && service.is_published) {
      return false;
    }
    if (
      queryParams.status === "draft_pending" &&
      !service.has_unpublished_changes
    ) {
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

  const basePath = adminDictionaryPath(dictionarySlug);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">サービス一覧</h1>
          <p className="mt-1 text-sm text-slate-600">
            {dictionary.name}のサービス。
            {isDomain
              ? "カードをタップして編集できます。"
              : "カードをタップして編集。変更は下書き保存後、「公開へ反映」で本番に出ます。"}
          </p>
        </div>
        <Link
          href={`${basePath}/services/new`}
          className="inline-flex h-12 min-w-[8rem] items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          サービス追加
        </Link>
      </div>

      <form
        className={`grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 ${
          isDomain ? "lg:grid-cols-3" : "lg:grid-cols-4"
        }`}
      >
        <input
          name="q"
          defaultValue={queryParams.q ?? ""}
          placeholder="キーワード検索"
          className="h-12 rounded-lg border border-slate-300 px-3 text-base sm:col-span-2 lg:col-span-1"
        />
        {!isDomain ? (
          <select
            name="category"
            defaultValue={queryParams.category ?? ""}
            className="h-12 rounded-lg border border-slate-300 px-3 text-base"
          >
            <option value="">すべてのカテゴリ</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : null}
        <select
          name="status"
          defaultValue={queryParams.status ?? ""}
          className="h-12 rounded-lg border border-slate-300 px-3 text-base"
        >
          <option value="">すべての公開状態</option>
          <option value="published">公開中</option>
          <option value="unpublished">非公開</option>
          {!isDomain ? (
            <option value="draft_pending">未公開の変更あり</option>
          ) : null}
        </select>
        <select
          name="sort"
          defaultValue={queryParams.sort ?? "updated"}
          className="h-12 rounded-lg border border-slate-300 px-3 text-base"
        >
          <option value="updated">更新日順</option>
          <option value="name">名前順</option>
          <option value="order">表示順</option>
        </select>
        <button
          type="submit"
          className={`h-12 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white sm:col-span-2 ${
            isDomain ? "lg:col-span-3" : "lg:col-span-4"
          } lg:w-fit`}
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
          const updatedAt = service.updated_at
            ? new Date(service.updated_at).toLocaleString("ja-JP")
            : "—";
          return (
            <Link
              key={service.id}
              href={`${basePath}/services/${service.id}`}
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
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-semibold text-slate-900">
                    {service.name}
                  </h2>
                  <StatusBadge status={badgeStatus} />
                  <span
                    className={`max-w-full shrink truncate rounded-md px-2 py-0.5 text-[11px] font-medium ${
                      service.affiliate_url?.trim()
                        ? "bg-violet-50 text-violet-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {service.affiliate_url?.trim()
                      ? "アフィリエイト設定済み"
                      : "公式URLのみ"}
                  </span>
                </div>
                {isDomain ? (
                  <>
                    <p className="mt-1 text-xs text-slate-500">{service.slug}</p>
                    <p className="mt-1 text-xs text-slate-700">
                      運営: {service.company_name?.trim() || "—"}
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
                          service.is_site_visible === false
                            ? "bg-rose-50 text-rose-800"
                            : "bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {service.is_site_visible === false
                          ? "本サイト非表示"
                          : "本サイト表示"}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5">
                        更新: {updatedAt}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
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
                          service.is_site_visible === false
                            ? "bg-rose-50 text-rose-800"
                            : "bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {service.is_site_visible === false
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
                  </>
                )}
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

      {dictionary.slug === "server" ? (
        <details className="rounded-2xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-800">
            TOP掲載サービス設定
          </summary>
          <div className="mt-4">
            <TopPlacementEditor
              allServices={allRows}
              visibleServices={visibleRows}
              dictionarySlug={dictionarySlug}
            />
          </div>
        </details>
      ) : null}
    </div>
  );
}

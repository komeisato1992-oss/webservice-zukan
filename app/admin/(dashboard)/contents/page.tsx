import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
} from "@/lib/contents/types";
import { ContentDeleteButton } from "@/components/admin/content-delete-button";
import type {
  ManagedContentStatus,
  ManagedContentType,
} from "@/lib/types/database";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function ContentsAdminPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("managed_contents")
    .select(
      "id, content_type, title, service_id, source_type, status, is_checked, priority, published_at, expires_at, updated_at, services(name)",
    )
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  const items = rows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">コンテンツ管理</h1>
          <p className="mt-1 text-sm text-slate-600">
            AI記事・お知らせ・キャンペーン・特集記事を管理します
          </p>
        </div>
        <Link
          href="/admin/contents/new"
          className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          新規作成
        </Link>
      </div>

      {error ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          コンテンツテーブルを読み込めませんでした。マイグレーション
          <code className="mx-1 rounded bg-white px-1">
            202607190005_comparison_display_and_contents.sql
          </code>
          を適用してください。
        </p>
      ) : null}

      <div className="space-y-3 md:hidden">
        {items.map((item) => {
          const service = Array.isArray(item.services)
            ? item.services[0]
            : item.services;
          const type = item.content_type as ManagedContentType;
          const status = item.status as ManagedContentStatus;
          return (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-500">
                    {CONTENT_TYPE_LABELS[type] ?? type}
                  </p>
                  <h2 className="mt-0.5 font-semibold text-slate-900">
                    {item.title}
                  </h2>
                </div>
                <Link
                  href={`/admin/contents/${item.id}`}
                  className="text-sm font-medium text-blue-700"
                >
                  編集
                </Link>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  <dt className="text-slate-400">サービス</dt>
                  <dd>{service?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">生成元</dt>
                  <dd>{item.source_type || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">確認</dt>
                  <dd>{item.is_checked ? "確認済" : "未確認"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">公開</dt>
                  <dd>{CONTENT_STATUS_LABELS[status] ?? status}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">優先</dt>
                  <dd>{item.priority ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">更新</dt>
                  <dd>{formatDate(item.updated_at)}</dd>
                </div>
              </dl>
              <ContentDeleteButton
                id={item.id}
                className="mt-3 h-9 rounded-lg border border-red-200 px-3 text-xs font-medium text-red-700"
              />
            </article>
          );
        })}
        {!error && items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
            コンテンツはまだありません。
          </p>
        ) : null}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-3 font-medium">種類</th>
              <th className="px-3 py-3 font-medium">タイトル</th>
              <th className="px-3 py-3 font-medium">対象サービス</th>
              <th className="px-3 py-3 font-medium">生成元</th>
              <th className="px-3 py-3 font-medium">確認</th>
              <th className="px-3 py-3 font-medium">公開</th>
              <th className="px-3 py-3 font-medium">優先</th>
              <th className="px-3 py-3 font-medium">公開開始</th>
              <th className="px-3 py-3 font-medium">公開終了</th>
              <th className="px-3 py-3 font-medium">更新</th>
              <th className="px-3 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const service = Array.isArray(item.services)
                ? item.services[0]
                : item.services;
              const type = item.content_type as ManagedContentType;
              const status = item.status as ManagedContentStatus;
              return (
                <tr key={item.id}>
                  <td className="px-3 py-3">
                    {CONTENT_TYPE_LABELS[type] ?? type}
                  </td>
                  <td className="max-w-[16rem] px-3 py-3 font-medium text-slate-900">
                    <span className="line-clamp-2">{item.title}</span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {service?.name ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {item.source_type || "—"}
                  </td>
                  <td className="px-3 py-3">
                    {item.is_checked ? "確認済" : "未確認"}
                  </td>
                  <td className="px-3 py-3">
                    {CONTENT_STATUS_LABELS[status] ?? status}
                  </td>
                  <td className="px-3 py-3">{item.priority ?? "—"}</td>
                  <td className="px-3 py-3 text-xs">
                    {formatDate(item.published_at)}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {formatDate(item.expires_at)}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {formatDate(item.updated_at)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/contents/${item.id}`}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        編集
                      </Link>
                      <ContentDeleteButton
                        id={item.id}
                        className="text-red-600 hover:underline"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!error && items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            コンテンツはまだありません。
          </p>
        ) : null}
      </div>
    </div>
  );
}

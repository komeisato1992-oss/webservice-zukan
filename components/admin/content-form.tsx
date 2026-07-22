"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteManagedContentAction,
  saveManagedContentAction,
} from "@/lib/actions/contents";
import {
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
} from "@/lib/contents/types";
import type {
  ManagedContent,
  ManagedContentStatus,
  ManagedContentType,
} from "@/lib/types/database";

type ServiceOption = { id: string; name: string };

type Props = {
  content?: ManagedContent | null;
  services: ServiceOption[];
};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ContentForm({ content, services }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPublished = content?.status === "published";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await saveManagedContentAction(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      if (!content && result.id) {
        router.push(`/admin/contents/${result.id}`);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!content) return;
    if (!window.confirm("このコンテンツを削除しますか？この操作は一覧から非表示になります。")) {
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", content.id);
      const result = await deleteManagedContentAction(fd);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push("/admin/contents");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      {content ? <input type="hidden" name="id" value={content.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">タイトル</span>
          <input
            name="title"
            required
            defaultValue={content?.title ?? ""}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">コンテンツ種類</span>
          <select
            name="content_type"
            defaultValue={content?.content_type ?? "notice"}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
          >
            {(Object.keys(CONTENT_TYPE_LABELS) as ManagedContentType[]).map(
              (key) => (
                <option key={key} value={key}>
                  {CONTENT_TYPE_LABELS[key]}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">対象サービス</span>
          <select
            name="service_id"
            defaultValue={content?.service_id ?? ""}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
          >
            <option value="">（なし）</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">要約</span>
          <textarea
            name="summary"
            rows={3}
            defaultValue={content?.summary ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">本文</span>
          <textarea
            name="body"
            rows={10}
            defaultValue={content?.body ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">出典URL</span>
          <input
            name="source_url"
            type="url"
            defaultValue={content?.source_url ?? ""}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">ステータス</span>
          <select
            name="status"
            defaultValue={content?.status ?? "draft"}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
          >
            {(Object.keys(CONTENT_STATUS_LABELS) as ManagedContentStatus[]).map(
              (key) => (
                <option key={key} value={key}>
                  {CONTENT_STATUS_LABELS[key]}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">優先順位（1が最優先）</span>
          <input
            name="priority"
            type="number"
            min={1}
            defaultValue={content?.priority ?? ""}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">公開開始日時</span>
          <input
            name="published_at"
            type="datetime-local"
            defaultValue={toLocalInput(content?.published_at)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">公開終了日時</span>
          <input
            name="expires_at"
            type="datetime-local"
            defaultValue={toLocalInput(content?.expires_at)}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            name="is_checked"
            value="true"
            defaultChecked={content?.is_checked ?? false}
          />
          確認済み
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            name="is_published"
            value="true"
            defaultChecked={isPublished}
          />
          公開する
        </label>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "保存中…" : "保存"}
        </button>
        {content ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="inline-flex h-10 items-center rounded-lg border border-red-300 px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            削除
          </button>
        ) : null}
      </div>
    </form>
  );
}

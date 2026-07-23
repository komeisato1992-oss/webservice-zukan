"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  duplicateServiceAction,
  saveTopPlacementAction,
  toggleServicePublishAction,
  type TopPlacementItemInput,
} from "@/lib/actions/admin";
import { SERVICE_STATUS_LABELS } from "@/lib/links";
import type { TopPlacementServiceRow } from "@/lib/admin/top-placement";
import {
  TOP_COMPARISON_MAX,
  TOP_FEATURED_COMPARISON_MAX,
} from "@/lib/site/top-placement";

type Props = {
  /** 掲載状態の正（全件） */
  allServices: TopPlacementServiceRow[];
  /** 一覧表示用（絞り込み後） */
  visibleServices: TopPlacementServiceRow[];
  dictionarySlug: string;
};

function orderedSelectedIds(
  services: TopPlacementServiceRow[],
  flag: "show_in_top_featured_comparison" | "show_in_top_comparison",
  orderKey: "top_featured_display_order" | "top_comparison_display_order",
) {
  return services
    .filter((s) => s[flag])
    .sort((a, b) => {
      const oa = a[orderKey];
      const ob = b[orderKey];
      if (oa != null && ob != null && oa !== ob) return oa - ob;
      if (oa != null && ob == null) return -1;
      if (oa == null && ob != null) return 1;
      return a.name.localeCompare(b.name, "ja");
    })
    .map((s) => s.id);
}

export function TopPlacementEditor({
  allServices,
  visibleServices,
  dictionarySlug,
}: Props) {
  const [featuredIds, setFeaturedIds] = useState<string[]>(() =>
    orderedSelectedIds(
      allServices,
      "show_in_top_featured_comparison",
      "top_featured_display_order",
    ),
  );
  const [comparisonIds, setComparisonIds] = useState<string[]>(() =>
    orderedSelectedIds(
      allServices,
      "show_in_top_comparison",
      "top_comparison_display_order",
    ),
  );
  const [savedFeatured, setSavedFeatured] = useState(featuredIds);
  const [savedComparison, setSavedComparison] = useState(comparisonIds);
  const [message, setMessage] = useState<{
    tone: "ok" | "error" | "info";
    text: string;
  } | null>(null);
  const [limitHint, setLimitHint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const featuredSet = useMemo(() => new Set(featuredIds), [featuredIds]);
  const comparisonSet = useMemo(() => new Set(comparisonIds), [comparisonIds]);

  const dirty =
    featuredIds.join(",") !== savedFeatured.join(",") ||
    comparisonIds.join(",") !== savedComparison.join(",");

  function toggleFeatured(id: string, next: boolean, isPublished: boolean) {
    if (!isPublished) return;
    if (next) {
      if (featuredSet.has(id)) return;
      if (featuredIds.length >= TOP_FEATURED_COMPARISON_MAX) {
        setLimitHint(
          "人気3社の比較には最大3件まで選択できます。先に別のサービスを解除してください。",
        );
        return;
      }
      setLimitHint(null);
      setFeaturedIds((prev) => [...prev, id]);
      return;
    }
    setLimitHint(null);
    setFeaturedIds((prev) => prev.filter((x) => x !== id));
  }

  function toggleComparison(id: string, next: boolean, isPublished: boolean) {
    if (!isPublished) return;
    if (next) {
      if (comparisonSet.has(id)) return;
      if (comparisonIds.length >= TOP_COMPARISON_MAX) {
        setLimitHint(
          "TOPの比較表には最大10件まで選択できます。先に別のサービスを解除してください。",
        );
        return;
      }
      setLimitHint(null);
      setComparisonIds((prev) => [...prev, id]);
      return;
    }
    setLimitHint(null);
    setComparisonIds((prev) => prev.filter((x) => x !== id));
  }

  function handleSave() {
    const featured = new Set(featuredIds);
    const comparison = new Set(comparisonIds);
    const payload: TopPlacementItemInput[] = allServices.map((s) => ({
      id: s.id,
      show_in_top_featured_comparison: featured.has(s.id),
      show_in_top_comparison: comparison.has(s.id),
      top_featured_display_order: featured.has(s.id)
        ? featuredIds.indexOf(s.id) + 1
        : null,
      top_comparison_display_order: comparison.has(s.id)
        ? comparisonIds.indexOf(s.id) + 1
        : null,
    }));

    startTransition(async () => {
      const result = await saveTopPlacementAction(payload);
      if (result.ok) {
        setSavedFeatured(featuredIds);
        setSavedComparison(comparisonIds);
        setMessage({ tone: "ok", text: result.message });
        setLimitHint(null);
      } else {
        setMessage({ tone: "error", text: result.message });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-20 -mx-1 space-y-3 border-b border-slate-200 bg-slate-50/95 px-1 py-3 backdrop-blur lg:static lg:mx-0 lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white lg:px-4 lg:py-4 lg:backdrop-blur-none">
        <p className="text-sm leading-relaxed text-slate-700">
          この設定はTOPページの初期表示だけに反映されます。比較ページでは、ユーザーが選択したサービスを優先します。
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-slate-800">
          <span>
            人気3社の比較：{featuredIds.length} / {TOP_FEATURED_COMPARISON_MAX}
            件選択中
          </span>
          <span>
            TOP比較：{comparisonIds.length} / {TOP_COMPARISON_MAX}件選択中
          </span>
        </div>
        {dirty ? (
          <p className="text-sm font-medium text-amber-700" role="status">
            未保存の変更があります
          </p>
        ) : null}
        {limitHint ? (
          <p className="text-sm text-rose-700" role="status">
            {limitHint}
          </p>
        ) : null}
        {message ? (
          <p
            className={
              message.tone === "ok"
                ? "text-sm text-emerald-700"
                : message.tone === "error"
                  ? "text-sm text-rose-700"
                  : "text-sm text-slate-600"
            }
            role="status"
          >
            {message.text}
          </p>
        ) : null}
        <div className="hidden lg:block">
          <SaveButton pending={pending} dirty={dirty} onSave={handleSave} />
        </div>
      </div>

      <div className="space-y-3 pb-24 lg:hidden">
        {visibleServices.map((service) => {
          const featured = featuredSet.has(service.id);
          const comparison = comparisonSet.has(service.id);
          const featuredDisabled =
            !service.is_published ||
            (!featured && featuredIds.length >= TOP_FEATURED_COMPARISON_MAX);
          const comparisonDisabled =
            !service.is_published ||
            (!comparison && comparisonIds.length >= TOP_COMPARISON_MAX);

          return (
            <div
              key={service.id}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex gap-3">
                <Logo url={service.logo_url} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{service.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {service.categoryName} /{" "}
                    {SERVICE_STATUS_LABELS[service.status] ?? service.status}
                    {service.is_featured ? " / おすすめ" : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    ASP: {service.aspLabel}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                <PlacementCheckbox
                  id={`m-featured-${service.id}`}
                  label="人気3社に掲載"
                  checked={featured}
                  disabled={featuredDisabled}
                  unpublished={!service.is_published}
                  onChange={(next) =>
                    toggleFeatured(service.id, next, service.is_published)
                  }
                />
                <PlacementCheckbox
                  id={`m-comparison-${service.id}`}
                  label="TOP比較に掲載"
                  checked={comparison}
                  disabled={comparisonDisabled}
                  unpublished={!service.is_published}
                  onChange={(next) =>
                    toggleComparison(service.id, next, service.is_published)
                  }
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/admin/${dictionarySlug}/services/${service.id}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium"
                >
                  編集
                </Link>
                <PublishToggle
                  id={service.id}
                  isPublished={service.is_published}
                  onMessage={(text) => setMessage({ tone: "info", text })}
                />
                <DuplicateButton id={service.id} />
              </div>
            </div>
          );
        })}
        {visibleServices.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            該当するサービスがありません。
          </p>
        ) : null}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white lg:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">サービス</th>
              <th className="px-4 py-3 font-medium">カテゴリ</th>
              <th className="px-4 py-3 font-medium">公開</th>
              <th className="px-4 py-3 text-center font-medium">人気3社に掲載</th>
              <th className="px-4 py-3 text-center font-medium">TOP比較に掲載</th>
              <th className="px-4 py-3 font-medium">おすすめ</th>
              <th className="px-4 py-3 font-medium">ASP</th>
              <th className="px-4 py-3 font-medium">更新</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleServices.map((service) => {
              const featured = featuredSet.has(service.id);
              const comparison = comparisonSet.has(service.id);
              const featuredDisabled =
                !service.is_published ||
                (!featured &&
                  featuredIds.length >= TOP_FEATURED_COMPARISON_MAX);
              const comparisonDisabled =
                !service.is_published ||
                (!comparison && comparisonIds.length >= TOP_COMPARISON_MAX);

              return (
                <tr key={service.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Logo url={service.logo_url} />
                      <span className="font-medium text-slate-900">
                        {service.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {service.categoryName}
                  </td>
                  <td className="px-4 py-3">
                    {SERVICE_STATUS_LABELS[service.status] ?? service.status}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PlacementCheckbox
                      id={`d-featured-${service.id}`}
                      label=""
                      checked={featured}
                      disabled={featuredDisabled}
                      unpublished={!service.is_published}
                      onChange={(next) =>
                        toggleFeatured(service.id, next, service.is_published)
                      }
                      compact
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PlacementCheckbox
                      id={`d-comparison-${service.id}`}
                      label=""
                      checked={comparison}
                      disabled={comparisonDisabled}
                      unpublished={!service.is_published}
                      onChange={(next) =>
                        toggleComparison(
                          service.id,
                          next,
                          service.is_published,
                        )
                      }
                      compact
                    />
                  </td>
                  <td className="px-4 py-3">
                    {service.is_featured ? "あり" : "-"}
                  </td>
                  <td className="px-4 py-3">{service.aspLabel}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(service.updated_at).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/${dictionarySlug}/services/${service.id}`}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        編集
                      </Link>
                      <PublishToggle
                        id={service.id}
                        isPublished={service.is_published}
                        onMessage={(text) =>
                          setMessage({ tone: "info", text })
                        }
                      />
                      <DuplicateButton id={service.id} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibleServices.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            該当するサービスがありません。
          </p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg flex-col gap-1.5">
          <p className="text-center text-xs text-slate-600">
            人気3社 {featuredIds.length}/{TOP_FEATURED_COMPARISON_MAX} · TOP比較{" "}
            {comparisonIds.length}/{TOP_COMPARISON_MAX}
            {dirty ? " · 未保存の変更あり" : ""}
          </p>
          <SaveButton pending={pending} dirty={dirty} onSave={handleSave} />
        </div>
      </div>
    </div>
  );
}

function SaveButton({
  pending,
  dirty,
  onSave,
}: {
  pending: boolean;
  dirty: boolean;
  onSave: () => void;
}) {
  return (
    <button
      type="button"
      disabled={pending || !dirty}
      onClick={onSave}
      className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
    >
      {pending ? "保存中…" : "TOP掲載設定を保存"}
    </button>
  );
}

function PlacementCheckbox({
  id,
  label,
  checked,
  disabled,
  unpublished,
  onChange,
  compact = false,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  unpublished: boolean;
  onChange: (next: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "inline-flex flex-col items-center gap-1" : ""}>
      <label
        htmlFor={id}
        className={
          compact
            ? "inline-flex cursor-pointer items-center justify-center"
            : "flex cursor-pointer items-start gap-2 text-sm text-slate-800"
        }
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {label ? <span>{label}</span> : null}
      </label>
      {unpublished ? (
        <p className="text-[11px] leading-snug text-slate-500">
          非公開のため選択できません
        </p>
      ) : null}
    </div>
  );
}

function Logo({ url }: { url: string | null }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-contain p-1" />
      ) : (
        <span className="text-slate-400" aria-hidden>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
            <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
            <line x1="6" x2="6.01" y1="6" y2="6" />
            <line x1="6" x2="6.01" y1="18" y2="18" />
          </svg>
        </span>
      )}
    </div>
  );
}

function PublishToggle({
  id,
  isPublished,
  onMessage,
}: {
  id: string;
  isPublished: boolean;
  onMessage?: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const formData = new FormData();
        formData.set("id", id);
        formData.set("status", isPublished ? "unpublished" : "published");
        startTransition(async () => {
          const result = await toggleServicePublishAction(formData);
          if (result.message) onMessage?.(result.message);
          if (result.ok) window.location.reload();
        });
      }}
      className="text-xs font-medium text-slate-600 hover:underline disabled:opacity-50"
    >
      {pending ? "更新中…" : isPublished ? "非公開にする" : "公開する"}
    </button>
  );
}

function DuplicateButton({ id }: { id: string }) {
  return (
    <form action={duplicateServiceAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-xs font-medium text-slate-600 hover:underline"
      >
        複製
      </button>
    </form>
  );
}

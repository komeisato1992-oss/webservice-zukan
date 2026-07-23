"use client";

import { useMemo, useState, useTransition } from "react";
import {
  RANKING_PURPOSE_OPTIONS,
  type PurposeOption,
} from "@/lib/site/content";
import type { RankingDraftPayload, RankingEntryDraft } from "@/lib/cms/rankings";
import {
  discardRankingDraftAction,
  publishRankingDraftAction,
  saveRankingDraftAction,
} from "@/lib/actions/rankings";

type ServiceOption = {
  id: string;
  name: string;
  slug: string;
  is_site_visible?: boolean | null;
};

type PlanOption = {
  id: string;
  service_id: string;
  name: string;
  is_published: boolean;
};

type Props = {
  dictionaryId: string;
  initialPayload: RankingDraftPayload;
  publishedPayload: RankingDraftPayload | null;
  services: ServiceOption[];
  plans: PlanOption[];
  changeCount: number;
  /** 表示するランキングカテゴリ。未指定時はサーバー図鑑用 */
  purposeOptions?: PurposeOption[];
  /** true のときプラン選択を出さない（ドメイン図鑑） */
  hidePlanSelect?: boolean;
};

export function RankingsEditor({
  dictionaryId,
  initialPayload,
  publishedPayload,
  services,
  plans,
  changeCount,
  purposeOptions = RANKING_PURPOSE_OPTIONS,
  hidePlanSelect = false,
}: Props) {
  const [payload, setPayload] = useState(initialPayload);
  const [purposeId, setPurposeId] = useState(
    purposeOptions[0]?.id ?? "overall",
  );
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [diffOpen, setDiffOpen] = useState(false);
  const [pending, start] = useTransition();

  const entriesForPurpose = useMemo(
    () =>
      payload.entries
        .filter((e) => e.purpose_id === purposeId)
        .sort((a, b) => a.rank - b.rank),
    [payload.entries, purposeId],
  );

  const hiddenWarnings = useMemo(() => {
    const warns: string[] = [];
    for (const e of entriesForPurpose) {
      if (!e.service_id) continue;
      const s = services.find((x) => x.id === e.service_id);
      if (s && s.is_site_visible === false) {
        warns.push(
          `${e.rank}位「${s.name}」は本サイト非表示です。公開してもカードに出ません。`,
        );
      }
    }
    return warns;
  }, [entriesForPurpose, services]);

  function updateEntry(rank: 1 | 2 | 3, patch: Partial<RankingEntryDraft>) {
    setPayload((prev) => ({
      entries: prev.entries.map((e) => {
        if (e.purpose_id !== purposeId || e.rank !== rank) return e;
        const next = { ...e, ...patch };
        if (patch.service_id !== undefined && patch.service_id !== e.service_id) {
          next.plan_id = null;
        }
        if (hidePlanSelect) {
          next.plan_id = null;
        }
        return next;
      }),
    }));
  }

  function plansForService(serviceId: string | null) {
    if (!serviceId) return [];
    return plans.filter((p) => p.service_id === serviceId && p.is_published);
  }

  function saveDraft() {
    start(async () => {
      const result = await saveRankingDraftAction(dictionaryId, payload);
      setMessage({ ok: result.ok, text: result.message });
    });
  }

  function publish() {
    if (!window.confirm("ランキングを本サイトへ公開反映しますか？")) return;
    start(async () => {
      const saved = await saveRankingDraftAction(dictionaryId, payload);
      if (!saved.ok) {
        setMessage({ ok: false, text: saved.message });
        return;
      }
      const result = await publishRankingDraftAction(dictionaryId);
      setMessage({ ok: result.ok, text: result.message });
    });
  }

  function discard() {
    if (!window.confirm("編集中のランキングを破棄して公開内容に戻しますか？")) {
      return;
    }
    start(async () => {
      const result = await discardRankingDraftAction(dictionaryId);
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok && publishedPayload) setPayload(publishedPayload);
    });
  }

  return (
    <div className="pb-28 lg:pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ランキング管理</h1>
          <p className="mt-1 text-sm text-slate-600">
            条件カテゴリごとに1〜3位を設定。下書き保存後、「公開へ反映」で本サイトに出ます。
            {changeCount > 0 ? `（未公開変更あり）` : ""}
          </p>
        </div>
      </div>

      {message ? (
        <p
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            message.ok
              ? "bg-emerald-50 text-emerald-800"
              : "bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="mt-4 lg:hidden">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          カテゴリ
        </label>
        <select
          value={purposeId}
          onChange={(e) => setPurposeId(e.target.value)}
          className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
        >
          {purposeOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 hidden flex-wrap gap-1.5 lg:flex">
        {purposeOptions.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setPurposeId(o.id)}
            className={`h-9 rounded-lg px-3 text-sm ${
              purposeId === o.id
                ? "bg-blue-600 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {hiddenWarnings.length > 0 ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-medium">非表示サービスが設定されています</p>
          <ul className="mt-1 list-disc pl-5">
            {hiddenWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        {entriesForPurpose.map((entry) => {
          const planOptions = plansForService(entry.service_id);
          return (
            <article
              key={`${entry.purpose_id}-${entry.rank}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  {entry.rank}位
                </h2>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={entry.is_visible}
                    onChange={(e) =>
                      updateEntry(entry.rank, { is_visible: e.target.checked })
                    }
                  />
                  表示する
                </label>
              </div>

              <div
                className={`mt-3 grid gap-3 ${
                  hidePlanSelect ? "" : "sm:grid-cols-2"
                }`}
              >
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    サービス
                  </label>
                  <select
                    value={entry.service_id ?? ""}
                    onChange={(e) =>
                      updateEntry(entry.rank, {
                        service_id: e.target.value || null,
                      })
                    }
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                  >
                    <option value="">未設定</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.is_site_visible === false ? "（サイト非表示）" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {!hidePlanSelect ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      プラン
                    </label>
                    <select
                      value={entry.plan_id ?? ""}
                      onChange={(e) =>
                        updateEntry(entry.rank, {
                          plan_id: e.target.value || null,
                        })
                      }
                      disabled={!entry.service_id}
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-50"
                    >
                      <option value="">代表プラン（自動）</option>
                      {planOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  評価（★）
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.5}
                    value={entry.rating ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateEntry(entry.rank, {
                        rating: v === "" ? null : Number(v),
                      });
                    }}
                    placeholder="例: 4.5"
                    className="h-11 w-28 rounded-lg border border-slate-300 px-3 text-sm"
                  />
                  <span className="text-sm tabular-nums text-amber-600">
                    {entry.rating != null ? `★ ${entry.rating}` : "未設定"}
                  </span>
                  <span className="text-xs text-slate-500">
                    0〜5（小数可・0.5刻み推奨）
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  カードコメント
                </label>
                <textarea
                  value={entry.card_comment}
                  onChange={(e) =>
                    updateEntry(entry.rank, { card_comment: e.target.value })
                  }
                  rows={2}
                  placeholder="例: 初心者でも設定が分かりやすく、サポートも充実"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  補足文
                </label>
                <input
                  type="text"
                  value={entry.sub_comment}
                  onChange={(e) =>
                    updateEntry(entry.rank, { sub_comment: e.target.value })
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
            </article>
          );
        })}
      </div>

      {diffOpen ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="font-semibold text-slate-900">差分確認</h3>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
            {JSON.stringify(
              {
                before: publishedPayload?.entries.filter(
                  (e) => e.purpose_id === purposeId,
                ),
                after: entriesForPurpose,
              },
              null,
              2,
            )}
          </pre>
          <button
            type="button"
            className="mt-3 text-sm text-slate-600 underline"
            onClick={() => setDiffOpen(false)}
          >
            閉じる
          </button>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-2 lg:max-w-none">
          <button
            type="button"
            disabled={pending}
            onClick={saveDraft}
            className="h-11 flex-1 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-60 sm:flex-none"
          >
            下書き保存
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setDiffOpen(true)}
            className="h-11 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 sm:flex-none"
          >
            差分確認
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={publish}
            className="h-11 flex-1 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-60 sm:flex-none"
          >
            公開へ反映
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={discard}
            className="h-11 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-700 sm:flex-none"
          >
            変更を破棄
          </button>
        </div>
      </div>
    </div>
  );
}

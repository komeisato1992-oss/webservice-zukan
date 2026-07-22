"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptScrapingCandidatesAction } from "@/lib/actions/cms";
import { resolvePlanFieldKey } from "@/lib/cms/plans";
import type { ScrapingCandidate } from "@/lib/cms/types";
import type { Json } from "@/lib/types/database";

type Props = {
  candidates: ScrapingCandidate[];
  /** サービス編集画面などに埋め込む場合は true にし、固定バーの重複を避ける */
  embedded?: boolean;
};

function formatDisplayValue(value: Json | null | undefined): string {
  if (value == null) return "未取得";
  if (typeof value === "boolean") return value ? "あり" : "なし";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function editableValue(value: Json | null | undefined): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatConfidence(confidence: number | null): string {
  if (confidence == null) return "—";
  return `${Math.round(confidence * 100)}%`;
}

function safeHref(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

type PlanGroup = {
  key: string;
  title: string;
  isNew: boolean;
  needsReview: boolean;
  planId: string | null;
  candidates: ScrapingCandidate[];
  summary: {
    name: string | null;
    monthly: string | null;
    storage: string | null;
    initialFee: string | null;
    sourceUrl: string | null;
    confidence: number | null;
  };
};

function groupPlanCandidates(pending: ScrapingCandidate[]): {
  planGroups: PlanGroup[];
  other: ScrapingCandidate[];
} {
  const groups = new Map<string, ScrapingCandidate[]>();
  const other: ScrapingCandidate[] = [];

  for (const c of pending) {
    const resolved = resolvePlanFieldKey(c.field_key);
    if (resolved.kind === "other" && !c.plan_id) {
      other.push(c);
      continue;
    }
    const key =
      c.plan_id ??
      (resolved.kind === "new_plan" ? `new:${resolved.newPlanKey}` : null) ??
      (c.field_label?.match(/【(.+?)】/)?.[1]
        ? `label:${c.field_label.match(/【(.+?)】/)?.[1]}`
        : null) ??
      `misc:${c.id}`;
    const list = groups.get(key) ?? [];
    list.push(c);
    groups.set(key, list);
  }

  const planGroups: PlanGroup[] = [...groups.entries()].map(([key, list]) => {
    const isNew =
      key.startsWith("new:") ||
      list.some(
        (c) =>
          resolvePlanFieldKey(c.field_key).kind === "new_plan" ||
          (typeof c.evidence === "string" && c.evidence.includes("新規プラン候補")),
      );
    const needsReview = list.some(
      (c) =>
        (typeof c.evidence === "string" && c.evidence.includes("要確認")) ||
        (c.confidence != null && c.confidence < 0.7),
    );
    const byCol = (col: string) =>
      list.find((c) => resolvePlanFieldKey(c.field_key).column === col);

    const nameCand = byCol("name");
    const monthly =
      byCol("effective_monthly_price") ??
      byCol("campaign_monthly_price") ??
      byCol("regular_monthly_price");
    const storage = byCol("storage_value");
    const storageUnit = byCol("storage_unit");
    const initial = byCol("initial_fee");
    const labelName = list[0]?.field_label?.match(/【(.+?)】/)?.[1] ?? null;

    const storageText =
      storage?.candidate_value != null
        ? `${formatDisplayValue(storage.candidate_value)}${
            storageUnit?.candidate_value != null
              ? formatDisplayValue(storageUnit.candidate_value)
              : ""
          }`
        : null;

    const confidences = list
      .map((c) => c.confidence)
      .filter((n): n is number => n != null);

    return {
      key,
      title: isNew ? "新規プラン候補" : "既存プラン更新候補",
      isNew,
      needsReview,
      planId: list.find((c) => c.plan_id)?.plan_id ?? null,
      candidates: list,
      summary: {
        name:
          nameCand?.candidate_value != null
            ? formatDisplayValue(nameCand.candidate_value)
            : labelName,
        monthly:
          monthly?.candidate_value != null
            ? `${formatDisplayValue(monthly.candidate_value)}円`
            : null,
        storage: storageText,
        initialFee:
          initial?.candidate_value != null
            ? `${formatDisplayValue(initial.candidate_value)}円`
            : null,
        sourceUrl: list.find((c) => c.source_url)?.source_url ?? null,
        confidence:
          confidences.length > 0
            ? confidences.reduce((a, b) => a + b, 0) / confidences.length
            : null,
      },
    };
  });

  planGroups.sort((a, b) => Number(b.isNew) - Number(a.isNew));
  return { planGroups, other };
}

/** スクレイピング取得候補のカード一覧。カードごとに採用／却下／編集して採用、下部に一括操作。 */
export function ScrapingCandidatesPanel({ candidates, embedded = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const pendingCandidates = useMemo(
    () => candidates.filter((c) => c.status === "pending"),
    [candidates],
  );
  const { planGroups, other } = useMemo(
    () => groupPlanCandidates(pendingCandidates),
    [pendingCandidates],
  );
  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([id]) => id),
    [selected],
  );

  function toggle(id: string, value: boolean) {
    setSelected((prev) => ({ ...prev, [id]: value }));
  }

  function toggleGroup(ids: string[], value: boolean) {
    setSelected((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = value;
      return next;
    });
  }

  function clearSelection(ids: string[]) {
    setSelected((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
  }

  function runAction(
    ids: string[],
    mode: "accept" | "reject" | "edit_accept",
    editedValue?: Json | null,
  ) {
    if (!ids.length || pending) return;
    startTransition(async () => {
      const result = await acceptScrapingCandidatesAction(ids, mode, editedValue);
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) {
        clearSelection(ids);
        setEditing((prev) => {
          const next = { ...prev };
          for (const id of ids) delete next[id];
          return next;
        });
        router.refresh();
      }
    });
  }

  const barClassName = embedded
    ? "sticky bottom-0 z-10 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur"
    : "fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pt-2 backdrop-blur [padding-bottom:calc(0.5rem+env(safe-area-inset-bottom))]";

  function renderCandidateCard(candidate: ScrapingCandidate) {
    const href = safeHref(candidate.source_url);
    const isEditing = editing[candidate.id] !== undefined;
    return (
      <article
        key={candidate.id}
        className="rounded-xl border border-slate-200 bg-white p-3"
      >
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={Boolean(selected[candidate.id])}
            onChange={(e) => toggle(candidate.id, e.target.checked)}
            aria-label="この候補を選択"
            className="mt-1 size-5 shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-900">
                {candidate.field_label ?? candidate.field_key}
              </p>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                信頼度 {formatConfidence(candidate.confidence)}
              </span>
            </div>

            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                <dt className="text-xs text-slate-500">公開中の値</dt>
                <dd className="mt-0.5 text-slate-800">
                  {formatDisplayValue(candidate.current_published_value)}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                <dt className="text-xs text-slate-500">ドラフトの値</dt>
                <dd className="mt-0.5 text-slate-800">
                  {formatDisplayValue(candidate.current_draft_value)}
                </dd>
              </div>
              <div className="rounded-lg bg-blue-50 px-2.5 py-2">
                <dt className="text-xs text-blue-700">取得候補</dt>
                <dd className="mt-0.5 font-medium text-blue-900">
                  {formatDisplayValue(candidate.candidate_value)}
                </dd>
              </div>
            </dl>

            {candidate.evidence ? (
              <p className="rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
                根拠: {candidate.evidence}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>
                取得: {new Date(candidate.fetched_at).toLocaleString("ja-JP")}
              </span>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-blue-700 hover:underline"
                >
                  {candidate.source_url}
                </a>
              ) : null}
            </div>

            {isEditing ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={editing[candidate.id] ?? ""}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, [candidate.id]: e.target.value }))
                  }
                  className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    runAction([candidate.id], "edit_accept", editing[candidate.id] ?? "")
                  }
                  className="h-10 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  編集して採用
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditing((prev) => {
                      const next = { ...prev };
                      delete next[candidate.id];
                      return next;
                    })
                  }
                  className="h-10 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-600"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => runAction([candidate.id], "accept")}
                  className="h-10 flex-1 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                >
                  採用
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => runAction([candidate.id], "reject")}
                  className="h-10 flex-1 rounded-lg border border-red-300 px-3 text-xs font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                >
                  却下
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditing((prev) => ({
                      ...prev,
                      [candidate.id]: editableValue(candidate.candidate_value),
                    }))
                  }
                  className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700 sm:flex-none"
                >
                  修正して採用
                </button>
              </div>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className={embedded ? "space-y-3" : "space-y-3 pb-24"}>
      {message ? (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {pendingCandidates.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          未確認の取得候補はありません。
        </p>
      ) : (
        <div className="space-y-4">
          {planGroups.map((group) => {
            const ids = group.candidates.map((c) => c.id);
            const allSelected = ids.every((id) => selected[id]);
            const href = safeHref(group.summary.sourceUrl);
            return (
              <section
                key={group.key}
                className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{group.title}</h3>
                      {group.needsReview ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          要確認
                        </span>
                      ) : null}
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-slate-700 sm:grid-cols-4">
                      <div>
                        <dt className="text-xs text-slate-500">プラン名</dt>
                        <dd className="font-medium">{group.summary.name ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">月額</dt>
                        <dd className="font-medium">{group.summary.monthly ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">容量</dt>
                        <dd className="font-medium">{group.summary.storage ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">初期費用</dt>
                        <dd className="font-medium">{group.summary.initialFee ?? "—"}</dd>
                      </div>
                    </dl>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>信頼度 {formatConfidence(group.summary.confidence)}</span>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-blue-700 hover:underline"
                        >
                          出典URL
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => runAction(ids, "accept")}
                    className="h-10 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white disabled:opacity-60"
                  >
                    {group.isNew ? "新規プランとして採用" : "既存プランへ反映"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => runAction(ids, "reject")}
                    className="h-10 rounded-lg border border-red-300 px-3 text-xs font-medium text-red-700 disabled:opacity-60"
                  >
                    却下
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleGroup(ids, !allSelected)}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700"
                  >
                    {allSelected ? "選択解除" : "項目を選択"}
                  </button>
                </div>

                <div className="space-y-2">{group.candidates.map(renderCandidateCard)}</div>
              </section>
            );
          })}

          {other.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">その他の候補</h3>
              {other.map(renderCandidateCard)}
            </section>
          ) : null}
        </div>
      )}

      {pendingCandidates.length > 0 ? (
        <div className={barClassName}>
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <p className="text-xs text-slate-500">{selectedIds.length}件選択中</p>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                disabled={pending || selectedIds.length === 0}
                onClick={() => runAction(selectedIds, "accept")}
                className="h-11 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                一括採用
              </button>
              <button
                type="button"
                disabled={pending || selectedIds.length === 0}
                onClick={() => runAction(selectedIds, "reject")}
                className="h-11 rounded-lg border border-red-300 px-4 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                一括却下
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

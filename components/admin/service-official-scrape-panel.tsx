"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  discardScrapingRunAction,
  getLatestScrapingRunAction,
  runOfficialInfoScraperAction,
  type ScrapingActionResult,
} from "@/lib/actions/scraping";
import {
  buildApplyDraft,
  buildRecommendedSelection,
  type AppliedScrapeDraft,
} from "@/lib/scraping/diff";
import type { ScrapeDiffItem } from "@/lib/scraping/types";
import { isScrapingSupported, scrapingProviderLabel } from "@/lib/scraping/catalog";

type Props = {
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  officialUrl: string | null;
  onApplyDraft: (draft: AppliedScrapeDraft) => void;
};

const CHANGE_LABEL: Record<ScrapeDiffItem["changeKind"], string> = {
  unchanged: "変更なし",
  added: "新規候補",
  changed: "変更候補",
  ambiguous: "要確認",
  not_found: "未取得",
  error: "エラー",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "待機中",
  running: "実行中",
  success: "成功",
  partial: "部分成功",
  failed: "失敗",
};

function confidenceClass(confidence: ScrapeDiffItem["confidence"]) {
  switch (confidence) {
    case "high":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "medium":
      return "bg-amber-50 text-amber-800 ring-amber-200";
    case "low":
      return "bg-red-50 text-red-800 ring-red-200";
  }
}

function confidenceLabel(confidence: ScrapeDiffItem["confidence"]) {
  switch (confidence) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
  }
}

function safeExternalHref(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function ServiceOfficialScrapePanel({
  serviceId,
  serviceSlug,
  serviceName,
  officialUrl,
  onApplyDraft,
}: Props) {
  const supported = isScrapingSupported(serviceSlug);
  const providerLabel = scrapingProviderLabel(serviceSlug) ?? serviceName;
  const [historyPending, startHistoryTransition] = useTransition();
  const [scrapePending, startScrapeTransition] = useTransition();
  const [result, setResult] = useState<ScrapingActionResult | null>(null);
  const [diffs, setDiffs] = useState<ScrapeDiffItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [runId, setRunId] = useState<string | undefined>();
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);
  const busy = scrapePending;

  // タブ表示時は前回取得結果のみ読み込む（Playwright は起動しない）
  useEffect(() => {
    if (!supported) return;
    startHistoryTransition(async () => {
      const latest = await getLatestScrapingRunAction(serviceId);
      setResult(latest);
      if (latest.diffs) {
        setDiffs(latest.diffs);
        setSelected(buildRecommendedSelection(latest.diffs));
      }
      setRunId(latest.runId);
    });
  }, [serviceId, supported]);

  const planDiffs = useMemo(
    () => diffs.filter((d) => d.group === "plan"),
    [diffs],
  );
  const comparisonDiffs = useMemo(
    () => diffs.filter((d) => d.group === "comparison"),
    [diffs],
  );
  const selectableIds = useMemo(
    () => diffs.filter((d) => d.selectable).map((d) => d.id),
    [diffs],
  );
  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected],
  );

  function applyResultState(next: ScrapingActionResult) {
    setResult(next);
    setRunId(next.runId);
    if (next.diffs) {
      setDiffs(next.diffs);
      setSelected(buildRecommendedSelection(next.diffs));
    }
  }

  function runScrape(force = false) {
    // Playwright 取得はボタン押下時のみ
    if (busy) return;

    if (
      (force || result?.recentWithinMinutes) &&
      result?.recentWithinMinutes &&
      !window.confirm(
        "直近10分以内に取得済みです。再取得しますか？（公式サイトへの負荷を避けるため、頻繁な実行は避けてください）",
      )
    ) {
      return;
    }

    setAppliedBanner(null);
    startScrapeTransition(async () => {
      const next = await runOfficialInfoScraperAction({
        serviceId,
        force: force || Boolean(result?.recentWithinMinutes),
      });

      if (next.recentWithinMinutes && !next.ok && !next.diffs?.length) {
        setResult(next);
        return;
      }

      applyResultState(next);
    });
  }

  function applySelected() {
    if (busy) return;
    const items = diffs.filter((d) => selected[d.id] && d.selectable);
    if (items.length === 0) {
      setAppliedBanner(null);
      setResult((prev) => ({
        ok: false,
        message: "反映する候補が選択されていません。",
        diffs,
        runId,
        status: prev?.status,
        provider: prev?.provider,
        fetchedAt: prev?.fetchedAt,
        sourceUrls: prev?.sourceUrls,
        warnings: prev?.warnings,
        durationMs: prev?.durationMs,
        foundCount: prev?.foundCount,
        missingCount: prev?.missingCount,
        warningCount: prev?.warningCount,
      }));
      return;
    }

    try {
      onApplyDraft(buildApplyDraft(items));
      setAppliedBanner(
        "取得候補をフォームへ反映しました。まだDBには保存されていません。プラン／比較項目タブで内容を確認し、既存の保存ボタンを押すまで公開データは変わりません。",
      );
      setResult((prev) => ({
        ...(prev ?? { ok: true, message: "" }),
        ok: true,
        message:
          "フォームへ反映しました。既存の保存ボタンでDBへ保存してください。",
      }));
    } catch {
      setAppliedBanner(null);
      setResult((prev) => ({
        ok: false,
        message: "フォームへの反映に失敗しました。",
        diffs,
        runId,
        status: prev?.status,
        provider: prev?.provider,
        fetchedAt: prev?.fetchedAt,
        sourceUrls: prev?.sourceUrls,
        warnings: prev?.warnings,
      }));
    }
  }

  function discard() {
    if (busy) return;
    if (!runId) {
      setDiffs([]);
      setSelected({});
      setAppliedBanner(null);
      setResult({ ok: true, message: "取得結果をクリアしました。" });
      return;
    }
    if (!window.confirm("この取得結果を破棄しますか？公開中のデータは消えません。")) {
      return;
    }
    startScrapeTransition(async () => {
      const discarded = await discardScrapingRunAction(runId);
      setResult(discarded);
      if (discarded.ok) {
        setDiffs([]);
        setSelected({});
        setRunId(undefined);
        setAppliedBanner(null);
      }
    });
  }

  if (!supported) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-sm text-slate-600">
        <p className="font-medium text-slate-800">
          このサービスはまだ公式情報取得に対応していません。
        </p>
        <p className="mt-2 text-slate-600">
          「{serviceName}」は管理画面から編集できます。Provider
          を追加すると、この画面から公式情報取得が使えるようになります。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {appliedBanner ? (
        <div
          role="status"
          className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
        >
          {appliedBanner}
        </div>
      ) : null}

      {/* 1. 取得概要 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              公式情報取得
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              取得対象: {providerLabel}（承認後にのみDB保存）
            </p>
            <p className="mt-1 text-xs text-slate-500">
              公式URL: {officialUrl || "未設定"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !officialUrl}
              onClick={() => runScrape(false)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <span
                    className="inline-block size-4 animate-spin rounded-full border-2 border-white border-r-transparent"
                    aria-hidden
                  />
                  取得中…
                </>
              ) : (
                "公式情報を取得"
              )}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => runScrape(true)}
              className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-sm text-slate-700 disabled:opacity-60"
            >
              再取得
            </button>
          </div>
        </div>

        {historyPending && !result ? (
          <p className="mt-3 text-sm text-slate-500">前回の取得結果を読み込み中…</p>
        ) : null}

        {busy ? (
          <p
            role="status"
            className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900"
          >
            公式サイトを確認しています…
          </p>
        ) : null}

        {!officialUrl ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            公式URLが未設定です。基本情報タブで登録してください。
          </p>
        ) : null}

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <OverviewItem label="provider" value={result?.provider ?? "—"} />
          <OverviewItem
            label="取得日時"
            value={
              result?.fetchedAt
                ? new Date(result.fetchedAt).toLocaleString("ja-JP")
                : "—"
            }
          />
          <OverviewItem
            label="実行ステータス"
            value={
              result?.status
                ? STATUS_LABEL[result.status] ?? result.status
                : "—"
            }
          />
          <OverviewItem
            label="実行時間"
            value={
              result?.durationMs != null ? `${result.durationMs} ms` : "—"
            }
          />
          <OverviewItem
            label="取得成功件数"
            value={
              result?.foundCount != null ? String(result.foundCount) : "—"
            }
          />
          <OverviewItem
            label="未取得件数"
            value={
              result?.missingCount != null ? String(result.missingCount) : "—"
            }
          />
          <OverviewItem
            label="warning件数"
            value={
              result?.warningCount != null
                ? String(result.warningCount)
                : String(result?.warnings?.length ?? 0)
            }
          />
          <OverviewItem
            label="選択中"
            value={`${selectedCount} / ${selectableIds.length}`}
          />
        </dl>

        {(result?.sourceUrls?.length ?? 0) > 0 ? (
          <div className="mt-4 text-xs text-slate-600">
            <p className="font-medium text-slate-700">取得元URL</p>
            <ul className="mt-1 space-y-1">
              {result!.sourceUrls!.map((url) => {
                const href = safeExternalHref(url);
                return (
                  <li key={url} className="break-all">
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:underline"
                      >
                        {url}
                      </a>
                    ) : (
                      <span>{url}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {result?.message ? (
          <p
            className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
              result.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {result.message}
          </p>
        ) : null}
      </section>

      {diffs.length === 0 && result && !busy && !historyPending ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          表示できる取得候補がありません。公式情報を取得してください。
        </p>
      ) : null}

      {/* 2. プラン候補 */}
      {planDiffs.length > 0 ? (
        <DiffSection
          title="プラン候補"
          items={planDiffs}
          selected={selected}
          onToggle={(id, v) =>
            setSelected((prev) => ({ ...prev, [id]: v }))
          }
        />
      ) : null}

      {/* 3. 比較項目候補 */}
      {comparisonDiffs.length > 0 ? (
        <DiffSection
          title="比較項目候補"
          items={comparisonDiffs}
          selected={selected}
          onToggle={(id, v) =>
            setSelected((prev) => ({ ...prev, [id]: v }))
          }
        />
      ) : null}

      {/* 4. 警告 */}
      {(result?.warnings?.length ?? 0) > 0 ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-amber-950">警告</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {result!.warnings!.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 5. 反映操作（下部固定） */}
      {diffs.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:static lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white lg:px-5 lg:py-4 lg:backdrop-blur-none">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                setSelected(
                  Object.fromEntries(selectableIds.map((id) => [id, true])),
                )
              }
              className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-medium disabled:opacity-60"
            >
              全候補を選択
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setSelected({})}
              className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-medium disabled:opacity-60"
            >
              全選択解除
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setSelected(buildRecommendedSelection(diffs))}
              className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-medium disabled:opacity-60"
            >
              推奨候補のみ選択
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={applySelected}
              className="h-9 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white disabled:opacity-60"
            >
              選択した候補をフォームへ反映
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={discard}
              className="h-9 rounded-lg border border-red-300 px-3 text-xs font-medium text-red-700 disabled:opacity-60"
            >
              取得結果を破棄
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OverviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function DiffSection({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: ScrapeDiffItem[];
  selected: Record<string, boolean>;
  onToggle: (id: string, value: boolean) => void;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>

      <div className="space-y-2 md:hidden">
        {items.map((item) => (
          <DiffCard
            key={item.id}
            item={item}
            checked={Boolean(selected[item.id])}
            onToggle={(v) => onToggle(item.id, v)}
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2">選択</th>
              <th className="px-3 py-2">項目</th>
              <th className="px-3 py-2">現在値</th>
              <th className="px-3 py-2">取得候補</th>
              <th className="px-3 py-2">状態</th>
              <th className="px-3 py-2">信頼度</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    disabled={!item.selectable}
                    checked={Boolean(selected[item.id])}
                    onChange={(e) => onToggle(item.id, e.target.checked)}
                  />
                </td>
                <td className="px-3 py-3">
                  <ItemMeta item={item} />
                </td>
                <td className="px-3 py-3">{item.currentValue ?? "未登録"}</td>
                <td className="px-3 py-3 font-medium">
                  {item.suggestedValue ?? "—"}
                </td>
                <td className="px-3 py-3">
                  {CHANGE_LABEL[item.changeKind]}
                </td>
                <td className="px-3 py-3">
                  <ConfidenceBadge confidence={item.confidence} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ItemMeta({ item }: { item: ScrapeDiffItem }) {
  const href = safeExternalHref(item.sourceUrl);
  return (
    <div>
      <p className="font-medium text-slate-900">
        {item.planName ? `${item.planName} / ` : ""}
        {item.label}
      </p>
      <div className="mt-1 flex flex-wrap gap-1">
        {item.inferred ? (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">
            推測
          </span>
        ) : null}
        {item.isNewPlanCandidate ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
            新規プラン候補
          </span>
        ) : null}
        {item.isMissingComparisonField ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
            比較項目未登録
          </span>
        ) : null}
      </div>
      {item.warning ? (
        <p className="mt-1 text-xs text-amber-700">{item.warning}</p>
      ) : null}
      <details className="mt-1">
        <summary className="cursor-pointer text-xs text-slate-500">
          詳細
        </summary>
        <div className="mt-1 space-y-1 text-xs text-slate-500">
          {item.rawValue ? <p>生データ: {item.rawValue.slice(0, 200)}</p> : null}
          <p className="break-all">
            取得元:{" "}
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:underline"
              >
                {item.sourceUrl}
              </a>
            ) : (
              item.sourceUrl
            )}
          </p>
        </div>
      </details>
    </div>
  );
}

function ConfidenceBadge({
  confidence,
}: {
  confidence: ScrapeDiffItem["confidence"];
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${confidenceClass(
        confidence,
      )}`}
    >
      {confidenceLabel(confidence)}
    </span>
  );
}

function DiffCard({
  item,
  checked,
  onToggle,
}: {
  item: ScrapeDiffItem;
  checked: boolean;
  onToggle: (v: boolean) => void;
}) {
  const href = safeExternalHref(item.sourceUrl);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1"
          disabled={!item.selectable}
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-slate-900">
            {item.planName ? `${item.planName} / ` : ""}
            {item.label}
          </span>
          <span className="mt-1 flex flex-wrap gap-1">
            {item.inferred ? (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">
                推測
              </span>
            ) : null}
            {item.isNewPlanCandidate ? (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                新規プラン候補
              </span>
            ) : null}
            {item.isMissingComparisonField ? (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                比較項目未登録
              </span>
            ) : null}
            <ConfidenceBadge confidence={item.confidence} />
          </span>
          <span className="mt-2 grid gap-1 text-xs text-slate-600">
            <span>現在: {item.currentValue ?? "未確認"}</span>
            <span>候補: {item.suggestedValue ?? "—"}</span>
            <span>状態: {CHANGE_LABEL[item.changeKind]}</span>
          </span>
          {item.warning ? (
            <span className="mt-1 block text-xs text-amber-700">
              {item.warning}
            </span>
          ) : null}
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-slate-500">
              詳細を表示
            </summary>
            <span className="mt-1 block space-y-1 text-xs text-slate-500">
              {item.rawValue ? (
                <span className="block">
                  生データ: {item.rawValue.slice(0, 200)}
                </span>
              ) : null}
              <span className="block break-all">
                source:{" "}
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700"
                  >
                    {item.sourceUrl}
                  </a>
                ) : (
                  item.sourceUrl
                )}
              </span>
            </span>
          </details>
        </span>
      </label>
    </article>
  );
}

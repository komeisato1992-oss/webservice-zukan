"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  listBulkScrapingJobsAction,
  listBulkUpdateTargetsAction,
  saveBulkScrapingJobAction,
  type BulkUpdateTarget,
} from "@/lib/actions/bulk-scraping";
import { runOfficialInfoScraperAction } from "@/lib/actions/scraping";
import { mapWithConcurrency } from "@/lib/scraping/concurrency";
import type { BulkScrapingItem } from "@/lib/types/database";

const CONCURRENCY = 4;

type HistoryJob = {
  id: string;
  startedAt: string;
  completedAt: string | null;
  successCount: number;
  failedCount: number;
  unsupportedCount: number;
};

function statusLabel(status: BulkScrapingItem["status"]) {
  switch (status) {
    case "success":
      return "取得成功";
    case "failed":
      return "取得失敗";
    case "unsupported":
      return "Provider未対応";
    case "running":
      return "取得中…";
    case "pending":
      return "待機中";
  }
}

function statusMark(status: BulkScrapingItem["status"]) {
  switch (status) {
    case "success":
      return "✔";
    case "failed":
      return "×";
    case "unsupported":
      return "－";
    case "running":
      return "…";
    case "pending":
      return "○";
  }
}

function summarize(items: BulkScrapingItem[]) {
  return {
    success: items.filter((i) => i.status === "success").length,
    failed: items.filter((i) => i.status === "failed").length,
    unsupported: items.filter((i) => i.status === "unsupported").length,
  };
}

function sanitizeDetail(text: string | null | undefined): string | null {
  if (!text) return null;
  return text
    .replace(/\/Users\/[^\s]+/g, "[path]")
    .replace(/at\s+\S+\s+\([^)]+\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

export function BulkServiceUpdatePanel({
  initialTargets,
  initialJobs,
}: {
  initialTargets: BulkUpdateTarget[];
  initialJobs: HistoryJob[];
}) {
  const [targets, setTargets] = useState(initialTargets);
  const [items, setItems] = useState<BulkScrapingItem[]>([]);
  const [jobs, setJobs] = useState(initialJobs);
  const [running, setRunning] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);
  const inFlight = useRef(new Set<string>());
  const runLock = useRef(false);

  const doneCount = useMemo(
    () =>
      items.filter((item) =>
        ["success", "failed", "unsupported"].includes(item.status),
      ).length,
    [items],
  );
  const totalCount = items.length || targets.length;
  const progressPercent =
    totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
  const summary = useMemo(() => summarize(items), [items]);

  const patchItemState = (
    serviceId: string,
    patch: Partial<BulkScrapingItem>,
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.serviceId === serviceId ? { ...item, ...patch } : item,
      ),
    );
  };

  async function scrapeOne(
    target: BulkUpdateTarget,
    onPatch?: (serviceId: string, patch: Partial<BulkScrapingItem>) => void,
  ) {
    if (inFlight.current.has(target.id)) return;
    inFlight.current.add(target.id);

    const apply = (patch: Partial<BulkScrapingItem>) => {
      if (onPatch) {
        onPatch(target.id, patch);
      } else {
        patchItemState(target.id, patch);
      }
    };

    apply({
      status: "running",
      message: "公式サイトを確認しています…",
      shortReason: null,
      detailMessage: null,
    });

    try {
      const result = await runOfficialInfoScraperAction({
        serviceId: target.id,
        force: true,
      });

      if (result.unsupported) {
        apply({
          status: "unsupported",
          message: "このサービスはまだ公式情報取得に対応していません。",
          shortReason: "Provider未対応",
          detailMessage: null,
        });
        return;
      }

      const ok = result.ok && result.status !== "failed";
      apply({
        status: ok ? "success" : "failed",
        message: ok
          ? "取得成功"
          : result.shortReason || result.message || "取得失敗",
        shortReason: ok ? null : result.shortReason ?? "取得失敗",
        detailMessage: ok
          ? null
          : sanitizeDetail(result.detailMessage || result.message),
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "取得中に例外が発生しました";
      apply({
        status: "failed",
        message: msg,
        shortReason: "予期しないエラー",
        detailMessage: sanitizeDetail(msg),
      });
    } finally {
      inFlight.current.delete(target.id);
    }
  }

  async function retryOne(item: BulkScrapingItem) {
    if (running || retryingId || inFlight.current.has(item.serviceId)) return;
    const target = targets.find((t) => t.id === item.serviceId);
    if (!target?.supported) return;

    setRetryingId(item.serviceId);
    try {
      await scrapeOne(target);
    } finally {
      setRetryingId(null);
    }
  }

  async function startBulkUpdate() {
    if (runLock.current || running || retryingId) return;
    if (
      !window.confirm("Provider対応済みサービスを最新情報へ更新します。")
    ) {
      return;
    }

    runLock.current = true;
    setRunning(true);
    setMessage("公式サイトを確認しています…");
    setCompletedAt(null);
    const started = new Date().toISOString();
    setStartedAt(started);

    const latest = await listBulkUpdateTargetsAction();
    const nextTargets = latest.ok ? latest.targets : targets;
    setTargets(nextTargets);

    let working: BulkScrapingItem[] = nextTargets.map((target) => ({
      serviceId: target.id,
      name: target.name,
      slug: target.slug,
      status: target.supported ? "pending" : "unsupported",
      message: target.supported
        ? "待機中"
        : "このサービスはまだ公式情報取得に対応していません。",
      shortReason: target.supported ? null : "Provider未対応",
      detailMessage: null,
    }));
    setItems(working);

    const patchWorking = (
      serviceId: string,
      patch: Partial<BulkScrapingItem>,
    ) => {
      working = working.map((item) =>
        item.serviceId === serviceId ? { ...item, ...patch } : item,
      );
      setItems(working);
    };

    const supported = nextTargets.filter((t) => t.supported);

    try {
      await mapWithConcurrency(supported, CONCURRENCY, async (target) => {
        await scrapeOne(target, patchWorking);
      });

      working = working.map((item) =>
        item.status === "pending" || item.status === "running"
          ? {
              ...item,
              status: "failed" as const,
              message: "未完了のため失敗扱い",
              shortReason: "予期しないエラー",
            }
          : item,
      );
      setItems(working);

      const completed = new Date().toISOString();
      setCompletedAt(completed);
      setMessage("更新完了");

      const saved = await saveBulkScrapingJobAction({
        startedAt: started,
        completedAt: completed,
        items: working,
      });
      if (saved.ok) {
        const history = await listBulkScrapingJobsAction();
        if (history.ok) setJobs(history.jobs);
      }
    } finally {
      setRunning(false);
      runLock.current = false;
      inFlight.current.clear();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">全サービス更新</h1>
          <p className="mt-1 text-sm text-slate-600">
            Provider対応済みのみ公式情報を取得し、取得候補（scraping_runs）を更新します。公開データには自動保存しません。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/server/services"
            className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-50"
          >
            サービス一覧へ
          </Link>
          <button
            type="button"
            disabled={running || Boolean(retryingId) || targets.length === 0}
            onClick={() => void startBulkUpdate()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {running ? (
              <>
                <span
                  className="inline-block size-4 animate-spin rounded-full border-2 border-white border-r-transparent"
                  aria-hidden
                />
                更新中…
              </>
            ) : (
              "全サービス更新"
            )}
          </button>
        </div>
      </div>

      {running || message ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-900">
              {running ? "公式サイトを確認しています…" : message}
            </p>
            <p className="text-sm text-slate-600">
              {doneCount}/{totalCount || targets.length}件
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {startedAt ? (
            <p className="mt-2 text-xs text-slate-500">
              開始: {new Date(startedAt).toLocaleString("ja-JP")}
              {completedAt
                ? ` ／ 完了: ${new Date(completedAt).toLocaleString("ja-JP")}`
                : null}
            </p>
          ) : null}
        </section>
      ) : null}

      {items.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">更新結果一覧</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {items.map((item) => {
              const isRetrying = retryingId === item.serviceId;
              const canRetry =
                item.status === "failed" && !running && !isRetrying;
              return (
                <li key={item.serviceId} className="px-5 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        <span className="mr-2 text-slate-500" aria-hidden>
                          {statusMark(item.status)}
                        </span>
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.slug}
                      </p>
                      {item.status === "failed" && item.shortReason ? (
                        <p className="mt-1 text-xs font-medium text-red-700">
                          {item.shortReason}
                        </p>
                      ) : null}
                      {item.status === "failed" && item.detailMessage ? (
                        <div className="mt-1">
                          <button
                            type="button"
                            className="text-[11px] text-slate-500 underline-offset-2 hover:underline"
                            onClick={() =>
                              setOpenDetailId((id) =>
                                id === item.serviceId ? null : item.serviceId,
                              )
                            }
                          >
                            {openDetailId === item.serviceId
                              ? "詳細を閉じる"
                              : "詳細を表示"}
                          </button>
                          {openDetailId === item.serviceId ? (
                            <p className="mt-1 rounded-md bg-slate-50 px-2 py-1.5 text-[11px] leading-relaxed text-slate-600">
                              {item.detailMessage}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <p
                        className={
                          item.status === "success"
                            ? "text-emerald-700"
                            : item.status === "failed"
                              ? "text-red-700"
                              : item.status === "unsupported"
                                ? "text-slate-500"
                                : "text-blue-700"
                        }
                      >
                        {isRetrying ? "取得中…" : statusLabel(item.status)}
                      </p>
                      {item.status === "failed" || isRetrying ? (
                        <button
                          type="button"
                          disabled={!canRetry && !isRetrying}
                          onClick={() => void retryOne(item)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isRetrying ? (
                            <>
                              <span
                                className="inline-block size-3 animate-spin rounded-full border-2 border-slate-400 border-r-transparent"
                                aria-hidden
                              />
                              取得中…
                            </>
                          ) : (
                            "再取得"
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {!running && completedAt ? (
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-800">
              <p className="font-semibold">更新完了</p>
              <p className="mt-1">成功：{summary.success}件</p>
              <p>未対応：{summary.unsupported}件</p>
              <p>失敗：{summary.failed}件</p>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-sm text-slate-600">
          「全サービス更新」を押すと、Provider対応済みサービスだけを並列取得します（同時
          {CONCURRENCY}件）。未対応はスキップ表示されます。
          <p className="mt-2 text-xs text-slate-500">
            現在の対象: 全{targets.length}件 / 対応済み
            {targets.filter((t) => t.supported).length}件
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">更新履歴</h2>
        </div>
        {jobs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">
            まだ更新履歴がありません。SQLマイグレーション
            <code className="mx-1 rounded bg-slate-100 px-1">
              202607180004_bulk_scraping_jobs.sql
            </code>
            を適用すると履歴が保存されます。
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {jobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {new Date(job.startedAt).toLocaleString("ja-JP")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {job.completedAt
                      ? `完了 ${new Date(job.completedAt).toLocaleString("ja-JP")}`
                      : "実行中/未完了"}
                  </p>
                </div>
                <div className="text-xs text-slate-600">
                  <span className="mr-3">成功 {job.successCount}</span>
                  <span className="mr-3">失敗 {job.failedCount}</span>
                  <span>未対応 {job.unsupportedCount}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

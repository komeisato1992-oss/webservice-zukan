"use client";

import { useMemo, useState, useTransition } from "react";
import {
  applySelectedChangesAction,
  exportToGoogleSheetsAction,
  getHistoryDetailAction,
  getSessionDiffsAction,
  getSpreadsheetPageDataAction,
  importFromGoogleSheetsAction,
  testGoogleSheetsConnectionAction,
  type SpreadsheetActionResult,
} from "@/lib/actions/spreadsheet";
import {
  formatDiffValue,
  type SpreadsheetDiffItem,
} from "@/lib/spreadsheet/diff";

type PageData = NonNullable<
  Awaited<ReturnType<typeof getSpreadsheetPageDataAction>>["data"]
>;

type TabId = "export" | "import" | "diff" | "history";

const TABS: { id: TabId; label: string }[] = [
  { id: "export", label: "1.エクスポート" },
  { id: "import", label: "3.インポート" },
  { id: "diff", label: "4.差分確認→下書き" },
  { id: "history", label: "履歴" },
];

const FLOW_STEPS = [
  { n: 1, label: "エクスポート" },
  { n: 2, label: "Sheetsで編集" },
  { n: 3, label: "インポート" },
  { n: 4, label: "差分確認" },
  { n: 5, label: "ドラフト保存" },
  { n: 6, label: "公開へ反映" },
] as const;

function changeTypeClass(t: SpreadsheetDiffItem["changeType"]) {
  switch (t) {
    case "changed":
      return "bg-amber-50 border-amber-200 text-amber-900";
    case "added":
      return "bg-emerald-50 border-emerald-200 text-emerald-900";
    case "error":
      return "bg-red-50 border-red-300 text-red-900";
    case "unchanged":
      return "bg-slate-50 border-slate-200 text-slate-600";
    default:
      return "bg-white border-slate-200";
  }
}

function changeTypeLabel(t: SpreadsheetDiffItem["changeType"]) {
  switch (t) {
    case "changed":
      return "変更";
    case "added":
      return "追加";
    case "error":
      return "エラー";
    case "unchanged":
      return "変更なし";
    default:
      return t;
  }
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ja-JP");
  } catch {
    return iso;
  }
}

export function SpreadsheetSyncPanel({ initial }: { initial: PageData }) {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<TabId>("export");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [applying, setApplying] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(
    initial.activeSession?.id ?? null,
  );
  const [diffs, setDiffs] = useState<SpreadsheetDiffItem[]>([]);
  const [diffsLoaded, setDiffsLoaded] = useState(false);
  const [importErrors, setImportErrors] = useState<
    Array<{
      sheetName: string;
      rowNumber: number;
      recordId: string;
      message: string;
    }>
  >(initial.activeSession?.errors ?? []);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<Awaited<
    ReturnType<typeof getHistoryDetailAction>
  >["data"] | null>(null);

  function run<T>(
    fn: () => Promise<SpreadsheetActionResult<T>>,
    onOk?: (data: T | undefined, message: string) => void,
  ) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setMessage(res.message);
      onOk?.(res.data, res.message);
    });
  }

  async function refreshPage() {
    const res = await getSpreadsheetPageDataAction();
    if (res.ok && res.data) setData(res.data);
  }

  async function loadSession(id: string) {
    const res = await getSessionDiffsAction(id);
    if (!res.ok || !res.data) {
      setError(res.message);
      return;
    }
    setSessionId(id);
    setDiffs(res.data.diffs);
    setDiffsLoaded(true);
    setImportErrors(res.data.errors);
    const next: Record<string, boolean> = {};
    for (const d of res.data.diffs) {
      if (d.selectable && d.changeType === "changed") next[d.id] = true;
    }
    setSelected(next);
  }

  const filteredDiffs = useMemo(() => {
    return diffs.filter((d) => {
      if (filter === "added" && d.changeType !== "added") return false;
      if (filter === "changed" && d.changeType !== "changed") return false;
      if (filter === "error" && d.changeType !== "error") return false;
      if (filter === "services" && d.sheetName !== "services") return false;
      if (filter === "plans" && d.sheetName !== "plans") return false;
      if (filter === "comparison_items" && d.sheetName !== "comparison_items")
        return false;
      if (
        serviceFilter &&
        !d.serviceName.toLowerCase().includes(serviceFilter.toLowerCase())
      ) {
        return false;
      }
      if (
        fieldFilter &&
        !d.fieldName.toLowerCase().includes(fieldFilter.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [diffs, filter, serviceFilter, fieldFilter]);

  const selectableVisible = useMemo(
    () => filteredDiffs.filter((d) => d.selectable),
    [filteredDiffs],
  );

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected],
  );

  const selectedDiffs = useMemo(
    () => diffs.filter((d) => selected[d.id] && d.selectable),
    [diffs, selected],
  );

  const confirmStats = useMemo(() => {
    const added = selectedDiffs.filter((d) => d.changeType === "added").length;
    const changed = selectedDiffs.filter(
      (d) => d.changeType === "changed",
    ).length;
    const services = new Set(
      selectedDiffs.map((d) => d.serviceId).filter(Boolean),
    ).size;
    const plans = new Set(
      selectedDiffs
        .filter((d) => d.sheetName === "plans")
        .map((d) => d.recordId),
    ).size;
    return {
      added,
      changed,
      services,
      plans,
      fields: selectedDiffs.length,
    };
  }, [selectedDiffs]);

  function selectAll() {
    setSelected((prev) => {
      const next = { ...prev };
      for (const d of diffs) if (d.selectable) next[d.id] = true;
      return next;
    });
  }

  function clearAll() {
    setSelected({});
  }

  function selectVisible() {
    setSelected((prev) => {
      const next = { ...prev };
      for (const d of selectableVisible) next[d.id] = true;
      return next;
    });
  }

  function selectByService(serviceId: string) {
    setSelected((prev) => {
      const next = { ...prev };
      for (const d of diffs) {
        if (d.serviceId === serviceId && d.selectable) next[d.id] = true;
      }
      return next;
    });
  }

  function selectByPlan(planId: string) {
    setSelected((prev) => {
      const next = { ...prev };
      for (const d of diffs) {
        if (d.recordId === planId && d.sheetName === "plans" && d.selectable) {
          next[d.id] = true;
        }
      }
      return next;
    });
  }

  function applyConfirmed() {
    if (!sessionId || applying) return;
    setConfirmOpen(false);
    setApplying(true);
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await applySelectedChangesAction({
        sessionId,
        changeIds: selectedIds,
      });
      setApplying(false);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setMessage(res.message);
      await refreshPage();
      if (sessionId) await loadSession(sessionId);
      setTab("history");
    });
  }

  async function openDetail(id: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    const res = await getHistoryDetailAction(id);
    setDetailLoading(false);
    if (res.ok) setDetail(res.data ?? null);
    else setError(res.message);
  }

  const serviceOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of diffs) {
      if (d.serviceId) map.set(d.serviceId, d.serviceName || d.serviceId);
    }
    return [...map.entries()];
  }, [diffs]);

  const planOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of diffs) {
      if (d.sheetName === "plans" && d.recordId) {
        map.set(d.recordId, d.planName || d.recordId);
      }
    }
    return [...map.entries()];
  }, [diffs]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Google Sheets</h1>
        <p className="mt-1 text-sm text-slate-600">
          インポート結果はドラフトへ保存されます。本番反映はサービス編集の「公開へ反映」のみです。
        </p>
        <ol className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {FLOW_STEPS.map((step) => (
            <li
              key={step.n}
              className="flex min-w-[7.5rem] shrink-0 flex-col rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              <span className="font-semibold text-slate-500">STEP {step.n}</span>
              <span className="mt-0.5 font-medium text-slate-800">
                {step.label}
              </span>
              <span className="mt-1 text-slate-400">
                {step.n === 2
                  ? "Sheets側"
                  : step.n === 6
                    ? "管理画面"
                    : "この画面"}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {data.migrationNeeded ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          同期テーブルが見つかりません。マイグレーション
          <code className="mx-1">202607190002</code> /
          <code className="mx-1">202607190004</code>
          を適用してください。
        </div>
      ) : null}

      {!data.sheetsConfigured ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Google Sheets 未接続です。不足: {data.sheetsStatus.missing.join(", ")}
        </div>
      ) : null}

      {message ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium ${
              tab === t.id
                ? "border-b-2 border-blue-600 text-blue-700"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "export" ? (
        <section className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">スプレッドシート名</dt>
                <dd className="font-medium text-slate-900">
                  {data.spreadsheetTitle ?? "（未取得）"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">スプレッドシートID</dt>
                <dd className="break-all font-mono text-xs text-slate-800">
                  {data.spreadsheetId || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">最終エクスポート日時</dt>
                <dd>{formatDate(data.lastExportAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">出力対象件数</dt>
                <dd>
                  services {data.exportCounts.services} / plans{" "}
                  {data.exportCounts.plans} / comparison_items{" "}
                  {data.exportCounts.comparisonItems}
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              {data.sheetUrl ? (
                <a
                  href={data.sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Googleスプレッドシートを開く
                </a>
              ) : null}
              <button
                type="button"
                disabled={pending || !data.sheetsConfigured}
                onClick={() =>
                  run(exportToGoogleSheetsAction, async () => {
                    await refreshPage();
                  })
                }
                className="inline-flex h-11 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {pending ? "書き出し中…" : "最新データを書き出す"}
              </button>
              <button
                type="button"
                disabled={pending || !data.sheetsConfigured}
                onClick={() =>
                  run(testGoogleSheetsConnectionAction, async (_, msg) => {
                    setMessage(msg);
                  })
                }
                className="inline-flex h-11 items-center rounded-lg border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                接続テスト
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "import" ? (
        <section className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">最終取得日時</dt>
                <dd>{formatDate(data.lastImportAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">取得対象シート</dt>
                <dd>services / plans / comparison_items</dd>
              </div>
              {data.activeSession ? (
                <>
                  <div>
                    <dt className="text-slate-500">正常取得件数</dt>
                    <dd>{data.activeSession.summary.okRows}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">変更候補 / 新規 / 警告 / エラー</dt>
                    <dd>
                      {data.activeSession.summary.changed} /{" "}
                      {data.activeSession.summary.added} /{" "}
                      {data.activeSession.summary.warning} /{" "}
                      {data.activeSession.summary.error}
                    </dd>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2 text-slate-500">
                  まだ取得セッションがありません。
                </div>
              )}
            </dl>
            <p className="mt-3 text-xs text-slate-500">
              空欄は削除しません。明示クリアは {data.clearSentinel} のみ。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending || !data.sheetsConfigured}
                onClick={() =>
                  run(importFromGoogleSheetsAction, async (d) => {
                    await refreshPage();
                    if (d?.sessionId) {
                      await loadSession(d.sessionId);
                      setTab("diff");
                    }
                  })
                }
                className="inline-flex h-11 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {pending ? "取得中…" : "スプレッドシートから取得"}
              </button>
              {sessionId ? (
                <button
                  type="button"
                  onClick={() => setTab("diff")}
                  className="inline-flex h-11 items-center rounded-lg border border-slate-300 px-4 text-sm text-slate-700"
                >
                  差分確認へ
                </button>
              ) : null}
            </div>
          </div>

          {importErrors.length > 0 ? (
            <div className="rounded-lg border border-red-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-red-800">
                エラー行（{importErrors.length}）
              </h2>
              <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-sm">
                {importErrors.map((e, i) => (
                  <li
                    key={`${e.sheetName}-${e.rowNumber}-${i}`}
                    className="rounded border border-red-100 bg-red-50 px-3 py-2 text-red-900"
                  >
                    {e.sheetName} 行{e.rowNumber}
                    {e.recordId ? ` / ${e.recordId}` : ""}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "diff" ? (
        <section className="space-y-4">
          {!sessionId ? (
            <p className="text-sm text-slate-600">
              先にインポートタブでスプレッドシートを取得してください。
            </p>
          ) : !diffsLoaded ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                確認待ちセッションがあります。差分を読み込んでください。
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await loadSession(sessionId);
                  })
                }
                className="inline-flex h-11 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {pending ? "読み込み中…" : "差分を読み込む"}
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">絞り込み</span>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
                  >
                    <option value="all">すべて</option>
                    <option value="added">追加のみ</option>
                    <option value="changed">変更のみ</option>
                    <option value="error">エラーのみ</option>
                    <option value="services">services</option>
                    <option value="plans">plans</option>
                    <option value="comparison_items">comparison_items</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">サービス名</span>
                  <input
                    value={serviceFilter}
                    onChange={(e) => setServiceFilter(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm sm:w-40"
                    placeholder="部分一致"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-slate-500">変更項目名</span>
                  <input
                    value={fieldFilter}
                    onChange={(e) => setFieldFilter(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm sm:w-40"
                    placeholder="部分一致"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2 text-sm">
                <button
                  type="button"
                  onClick={selectAll}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                >
                  すべて選択
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                >
                  すべて解除
                </button>
                <button
                  type="button"
                  onClick={selectVisible}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                >
                  表示中だけ選択
                </button>
                <select
                  className="rounded-lg border border-slate-300 px-2 py-1.5"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) selectByService(e.target.value);
                    e.target.value = "";
                  }}
                >
                  <option value="">サービス単位で選択…</option>
                  {serviceOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-lg border border-slate-300 px-2 py-1.5"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) selectByPlan(e.target.value);
                    e.target.value = "";
                  }}
                >
                  <option value="">プラン単位で選択…</option>
                  {planOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {filteredDiffs.map((d) => (
                  <article
                    key={d.id}
                    className={`rounded-lg border p-3 ${changeTypeClass(d.changeType)}`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1"
                        disabled={!d.selectable}
                        checked={Boolean(selected[d.id])}
                        onChange={(e) =>
                          setSelected((prev) => ({
                            ...prev,
                            [d.id]: e.target.checked,
                          }))
                        }
                      />
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="font-medium">
                          {changeTypeLabel(d.changeType)} · {d.sheetName}
                        </div>
                        <div className="mt-1 text-slate-700">
                          {d.serviceName || "—"}
                          {d.planName ? ` / ${d.planName}` : ""}
                        </div>
                        <div className="mt-1 font-medium">{d.fieldName}</div>
                        <div className="mt-2 grid gap-1 text-xs">
                          <div>
                            <span className="text-slate-500">現在: </span>
                            {formatDiffValue(d.oldValue)}
                          </div>
                          <div>
                            <span className="text-slate-500">変更後: </span>
                            {formatDiffValue(d.newValue)}
                          </div>
                        </div>
                        {d.warning ? (
                          <p className="mt-1 text-xs text-amber-800">
                            {d.warning}
                          </p>
                        ) : null}
                        {d.errorMessage ? (
                          <p className="mt-1 text-xs text-red-700">
                            {d.errorMessage}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-600">
                    <tr>
                      <th className="px-3 py-2">選択</th>
                      <th className="px-3 py-2">種別</th>
                      <th className="px-3 py-2">シート</th>
                      <th className="px-3 py-2">サービス</th>
                      <th className="px-3 py-2">プラン</th>
                      <th className="px-3 py-2">項目</th>
                      <th className="px-3 py-2">現在</th>
                      <th className="px-3 py-2">変更後</th>
                      <th className="px-3 py-2">警告/エラー</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDiffs.map((d) => (
                      <tr
                        key={d.id}
                        className={`border-t ${changeTypeClass(d.changeType)}`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            disabled={!d.selectable}
                            checked={Boolean(selected[d.id])}
                            onChange={(e) =>
                              setSelected((prev) => ({
                                ...prev,
                                [d.id]: e.target.checked,
                              }))
                            }
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {changeTypeLabel(d.changeType)}
                        </td>
                        <td className="px-3 py-2">{d.sheetName}</td>
                        <td className="px-3 py-2">{d.serviceName || "—"}</td>
                        <td className="px-3 py-2">{d.planName || "—"}</td>
                        <td className="px-3 py-2">{d.fieldName}</td>
                        <td className="max-w-[10rem] truncate px-3 py-2">
                          {formatDiffValue(d.oldValue)}
                        </td>
                        <td className="max-w-[10rem] truncate px-3 py-2">
                          {formatDiffValue(d.newValue)}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {d.errorMessage || d.warning || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ) : null}

      {tab === "history" ? (
        <section className="space-y-3">
          {data.history.length === 0 ? (
            <p className="text-sm text-slate-600">履歴はまだありません。</p>
          ) : (
            data.history.map((h) => (
              <article
                key={h.id}
                className="rounded-lg border border-slate-200 bg-white p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-900">
                      {formatDate(h.createdAt)} · {h.statusLabel}
                    </div>
                    <div className="mt-1 text-slate-600">
                      {h.syncType} / {h.source}
                    </div>
                    <div className="mt-1 text-slate-600">
                      追加 {h.addedCount} · 変更 {h.changedCount} · エラー{" "}
                      {h.errorCount} · 対象サービス {h.targetServiceCount}
                    </div>
                    {h.message ? (
                      <p className="mt-1 text-slate-500">{h.message}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => openDetail(h.id)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    詳細を見る
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      ) : null}

      {/* Sticky apply bar */}
      {tab === "diff" && sessionId ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="text-sm text-slate-700">
              選択中 <span className="font-semibold">{selectedIds.length}</span>{" "}
              件
            </p>
            <button
              type="button"
              disabled={pending || applying || selectedIds.length === 0}
              onClick={() => setConfirmOpen(true)}
              className="inline-flex h-11 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {applying ? "反映中…" : "選択した変更を反映"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Confirm dialog */}
      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">
              反映前確認
            </h2>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              <li>追加件数: {confirmStats.added}</li>
              <li>変更件数: {confirmStats.changed}</li>
              <li>対象サービス数: {confirmStats.services}</li>
              <li>対象プラン数: {confirmStats.plans}</li>
              <li>反映対象項目数: {confirmStats.fields}</li>
            </ul>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={applying}
                onClick={applyConfirmed}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                反映する
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* History detail modal */}
      {detailOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold">変更詳細</h2>
              <button
                type="button"
                onClick={() => {
                  setDetailOpen(false);
                  setDetail(null);
                }}
                className="text-sm text-slate-600"
              >
                閉じる
              </button>
            </div>
            <div className="overflow-y-auto p-5 text-sm">
              {detailLoading ? (
                <p>読み込み中…</p>
              ) : detail ? (
                <div className="space-y-3">
                  <p className="text-slate-600">
                    {formatDate(detail.session.created_at)} ·{" "}
                    {STATUS_LABEL_UI[detail.session.status] ??
                      detail.session.status}
                  </p>
                  {detail.changes.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border border-slate-200 p-3"
                    >
                      <div className="font-medium">
                        {c.sheetName} / {c.fieldName}
                      </div>
                      <div className="mt-1 text-slate-600">
                        {c.serviceName}
                        {c.planName ? ` / ${c.planName}` : ""}
                      </div>
                      <div className="mt-2 grid gap-1 text-xs">
                        <div>
                          <span className="text-slate-500">
                            変更前の値を確認:{" "}
                          </span>
                          {c.oldValue}
                        </div>
                        <div>
                          <span className="text-slate-500">変更後: </span>
                          {c.newValue}
                        </div>
                        <div>
                          {c.changeType} · {c.status}
                          {c.errorMessage ? ` · ${c.errorMessage}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>データがありません</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const STATUS_LABEL_UI: Record<string, string> = {
  pending: "取得済み",
  fetched: "取得済み",
  awaiting_review: "確認待ち",
  applying: "反映中",
  applied: "反映完了",
  success: "反映完了",
  partial: "一部失敗",
  failed: "失敗",
  cancelled: "取消済み",
  rolled_back: "取消済み",
  running: "反映中",
};

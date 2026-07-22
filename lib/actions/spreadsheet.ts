"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublicSiteCache } from "@/lib/site/cache";
import {
  applySessionChanges,
  rollbackSyncRun,
} from "@/lib/spreadsheet/apply";
import {
  buildMultiSheetDiffs,
  formatDiffValue,
  summarizeDiffs,
  type SpreadsheetDiffItem,
} from "@/lib/spreadsheet/diff";
import { CLEAR_SENTINEL, SHEET_NAMES } from "@/lib/spreadsheet/fields";
import {
  getSheetsConfigStatus,
  hasGoogleSheetsEnv,
} from "@/lib/spreadsheet/google-env";
import {
  exportBundleToSheets,
  getSpreadsheetMeta,
  readAllSyncSheets,
  spreadsheetUrl,
  testSheetsConnection,
} from "@/lib/spreadsheet/google-sheets";
import { loadSpreadsheetExportData } from "@/lib/spreadsheet/load";
import { importRankingsSheetToDraft } from "@/lib/spreadsheet/rankings-import";
import type {
  SpreadsheetSyncChange,
  SpreadsheetSyncRun,
  SpreadsheetSyncStatus,
} from "@/lib/types/database";

export type SpreadsheetActionResult<T = unknown> = {
  ok: boolean;
  message: string;
  data?: T;
};

const STATUS_LABEL: Record<string, string> = {
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

async function revalidateTouchedServices(serviceIds: string[]) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  revalidatePath("/admin/spreadsheet");
  revalidatePath("/admin/services");
  revalidatePath("/");
  revalidatePath("/server");
  revalidatePath("/server/services");
  revalidatePath("/server/compare");
  revalidatePublicSiteCache();

  for (const id of serviceIds) {
    const { data: service } = await supabase
      .from("services")
      .select("slug, category_id")
      .eq("id", id)
      .maybeSingle();
    if (!service) continue;
    revalidatePath(`/admin/services/${id}`);
    revalidatePath(`/server/services/${service.slug}`);
    const { data: category } = await supabase
      .from("categories")
      .select("slug")
      .eq("id", service.category_id)
      .maybeSingle();
    if (category?.slug) {
      revalidatePath(`/${category.slug}`);
      revalidatePath(`/${category.slug}/services`);
      revalidatePath(`/${category.slug}/services/${service.slug}`);
      revalidatePath(`/${category.slug}/compare`);
    }
  }
}

function mapChangeToDiff(c: SpreadsheetSyncChange): SpreadsheetDiffItem {
  return {
    id: c.id,
    sheetName: (c.sheet_name as SpreadsheetDiffItem["sheetName"]) ?? "services",
    tableName:
      (c.table_name as SpreadsheetDiffItem["tableName"]) ?? "services",
    recordId: c.record_id ?? "",
    recordSlug: c.record_slug ?? "",
    serviceId: c.service_id ?? "",
    serviceSlug: c.service_slug ?? "",
    serviceName: c.service_name ?? "",
    planName: c.plan_name ?? "",
    fieldName: c.field_name,
    fieldLabel: c.field_name,
    oldValue: c.old_value as never,
    newValue: c.new_value as never,
    changeType:
      c.change_type === "cleared"
        ? "changed"
        : c.change_type === "conflict"
          ? "error"
          : (c.change_type as SpreadsheetDiffItem["changeType"]),
    errorMessage: c.error_message ?? undefined,
    warning: c.warning ?? undefined,
    selectable:
      c.change_type === "changed" &&
      c.status !== "applied" &&
      c.status !== "error",
    rowNumber: c.row_number ?? 0,
  };
}

export async function getSpreadsheetPageDataAction(): Promise<
  SpreadsheetActionResult<{
    sheetsConfigured: boolean;
    sheetsStatus: ReturnType<typeof getSheetsConfigStatus>;
    sheetUrl: string | null;
    spreadsheetTitle: string | null;
    spreadsheetId: string;
    clearSentinel: string;
    migrationNeeded: boolean;
    exportCounts: {
      services: number;
      plans: number;
      comparisonItems: number;
    };
    lastExportAt: string | null;
    lastImportAt: string | null;
    activeSession: {
      id: string;
      status: string;
      statusLabel: string;
      summary: {
        okRows: number;
        changed: number;
        added: number;
        unchanged: number;
        error: number;
        warning: number;
      };
      fetchedAt: string;
      sheetNames: string[];
      errors: Array<{
        sheetName: string;
        rowNumber: number;
        recordId: string;
        message: string;
      }>;
    } | null;
    history: Array<{
      id: string;
      syncType: string;
      source: string;
      status: string;
      statusLabel: string;
      addedCount: number;
      changedCount: number;
      errorCount: number;
      targetServiceCount: number;
      message: string | null;
      createdAt: string;
      completedAt: string | null;
      createdBy: string | null;
    }>;
  }>
> {
  const { supabase, admin, user } = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "管理者権限が必要です。" };
  }

  const sheetsStatus = getSheetsConfigStatus();
  let spreadsheetTitle: string | null = null;
  if (sheetsStatus.configured) {
    try {
      const meta = await getSpreadsheetMeta();
      spreadsheetTitle = meta.title;
    } catch (e) {
      console.error("getSpreadsheetMeta", e);
    }
  }

  const { count: serviceCount } = await supabase
    .from("services")
    .select("*", { count: "exact", head: true });
  const { count: planCount } = await supabase
    .from("service_plans")
    .select("*", { count: "exact", head: true });
  const { count: fieldCount } = await supabase
    .from("comparison_fields")
    .select("*", { count: "exact", head: true });

  const { data: runs, error: runsError } = await supabase
    .from("spreadsheet_sync_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(40);

  const migrationNeeded = Boolean(runsError);
  if (migrationNeeded) {
    console.error("spreadsheet tables missing?", runsError?.message);
  }

  const lastExport = (runs ?? []).find(
    (r) =>
      r.sync_type === "spreadsheet_export" ||
      r.sync_type === "export_sheets",
  );
  const lastImport = (runs ?? []).find(
    (r) => r.sync_type === "spreadsheet_import",
  );

  const activeRun = (runs ?? []).find((r) =>
    ["awaiting_review", "fetched", "partial", "applying"].includes(r.status),
  );

  type ActiveSession = {
    id: string;
    status: string;
    statusLabel: string;
    summary: {
      okRows: number;
      changed: number;
      added: number;
      unchanged: number;
      error: number;
      warning: number;
    };
    fetchedAt: string;
    sheetNames: string[];
    errors: Array<{
      sheetName: string;
      rowNumber: number;
      recordId: string;
      message: string;
    }>;
  };

  let activeSession: ActiveSession | null = null;

  if (activeRun) {
    const meta = (activeRun.meta ?? {}) as {
      summary?: ActiveSession["summary"];
    };
    const { data: errRows } = await supabase
      .from("spreadsheet_sync_errors")
      .select("sheet_name, row_number, record_id, message")
      .eq("session_id", activeRun.id)
      .limit(50);

    activeSession = {
      id: activeRun.id,
      status: activeRun.status,
      statusLabel: STATUS_LABEL[activeRun.status] ?? activeRun.status,
      summary: meta.summary ?? {
        okRows: activeRun.total_rows ?? 0,
        changed: activeRun.changed_count ?? 0,
        added: activeRun.added_count ?? 0,
        unchanged: activeRun.unchanged_count ?? 0,
        error: activeRun.error_count ?? 0,
        warning: activeRun.warning_count ?? 0,
      },
      fetchedAt: activeRun.created_at,
      sheetNames: [
        SHEET_NAMES.services,
        SHEET_NAMES.plans,
        SHEET_NAMES.comparisonItems,
      ],
      errors: (errRows ?? []).map((e) => ({
        sheetName: e.sheet_name ?? "",
        rowNumber: e.row_number ?? 0,
        recordId: e.record_id ?? "",
        message: e.message,
      })),
    };
  }

  const history = (runs ?? []).map((r) => ({
    id: r.id,
    syncType: r.sync_type,
    source: r.source,
    status: r.status,
    statusLabel: STATUS_LABEL[r.status] ?? r.status,
    addedCount: r.added_count ?? 0,
    changedCount: r.changed_count ?? r.difference_count ?? 0,
    errorCount: r.error_count,
    targetServiceCount: r.target_service_ids?.length ?? 0,
    message: r.message,
    createdAt: r.created_at,
    completedAt: r.completed_at,
    createdBy: r.created_by,
  }));

  void user;

  return {
    ok: true,
    message: "ok",
    data: {
      sheetsConfigured: hasGoogleSheetsEnv(),
      sheetsStatus,
      sheetUrl: sheetsStatus.sheetId
        ? spreadsheetUrl(sheetsStatus.sheetId)
        : null,
      spreadsheetTitle,
      spreadsheetId: sheetsStatus.sheetId,
      clearSentinel: CLEAR_SENTINEL,
      migrationNeeded,
      exportCounts: {
        services: serviceCount ?? 0,
        plans: planCount ?? 0,
        comparisonItems: fieldCount ?? 0,
      },
      lastExportAt: lastExport?.created_at ?? null,
      lastImportAt: lastImport?.created_at ?? null,
      activeSession,
      history,
    },
  };
}

export async function exportToGoogleSheetsAction(): Promise<
  SpreadsheetActionResult<{
    sheetUrl: string;
    spreadsheetTitle: string;
    counts: { services: number; plans: number; comparisonItems: number };
  }>
> {
  const { supabase, admin, user } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };
  if (!hasGoogleSheetsEnv()) {
    return {
      ok: false,
      message:
        "Google Sheets の環境変数が未設定です。GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_SPREADSHEET_ID を確認してください。",
    };
  }

  try {
    const bundle = await loadSpreadsheetExportData(user?.email ?? null);
    const result = await exportBundleToSheets(bundle);
    const status = getSheetsConfigStatus();

    await supabase.from("spreadsheet_sync_runs").insert({
      sync_type: "spreadsheet_export",
      source: "google_sheets",
      status: "success",
      spreadsheet_id: status.sheetId,
      exported_count:
        bundle.counts.services +
        bundle.counts.plans +
        bundle.counts.comparisonItems,
      total_rows:
        bundle.counts.services +
        bundle.counts.plans +
        bundle.counts.comparisonItems,
      message: `services ${bundle.counts.services} / plans ${bundle.counts.plans} / comparison_items ${bundle.counts.comparisonItems}`,
      meta: {
        counts: bundle.counts,
        spreadsheetTitle: result.spreadsheetTitle,
      } as never,
      created_by: user?.id ?? null,
      completed_at: new Date().toISOString(),
    });

    revalidatePath("/admin/spreadsheet");
    return {
      ok: true,
      message: "最新データをスプレッドシートへ書き出しました",
      data: {
        sheetUrl: result.sheetUrl,
        spreadsheetTitle: result.spreadsheetTitle,
        counts: bundle.counts,
      },
    };
  } catch (e) {
    console.error("exportToGoogleSheetsAction", e);
    return {
      ok: false,
      message:
        e instanceof Error
          ? e.message
          : "スプレッドシートへの書き出しに失敗しました",
    };
  }
}

export async function importFromGoogleSheetsAction(): Promise<
  SpreadsheetActionResult<{
    sessionId: string;
    summary: ReturnType<typeof summarizeDiffs> & {
      okRows: number;
      warning: number;
    };
    warnings: string[];
    errorCount: number;
  }>
> {
  const { supabase, admin, user } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };
  if (!hasGoogleSheetsEnv()) {
    return { ok: false, message: "Google Sheets の環境変数が未設定です。" };
  }

  // Block if another apply is running
  const { data: applying } = await supabase
    .from("spreadsheet_sync_runs")
    .select("id")
    .eq("status", "applying")
    .maybeSingle();
  if (applying) {
    return { ok: false, message: "他の同期処理が実行中です。完了後に再試行してください。" };
  }

  try {
    const sheets = await readAllSyncSheets();
    if (sheets.services.missing) {
      return {
        ok: false,
        message: "シート「services」が見つかりません。先にエクスポートしてください。",
      };
    }

    const db = await loadSpreadsheetExportData();

    // rankings は差分レビュー対象外。インポート内容はドラフトのみへ保存（直接公開しない）
    const serviceIdByKey = new Map<string, string>();
    const planIdByKey = new Map<string, string>();
    for (const row of db.serviceRows) {
      const id = String(row.service_id ?? "");
      const slug = String(row.slug ?? "");
      if (id) {
        serviceIdByKey.set(id, id);
        if (slug) serviceIdByKey.set(slug, id);
      }
    }
    for (const row of db.planRows) {
      const id = String(row.plan_id ?? "");
      const serviceId = String(row.service_id ?? "");
      const name = String(row["プラン名"] ?? row.plan_name ?? "");
      if (id) planIdByKey.set(id, id);
      if (serviceId && name) planIdByKey.set(`${serviceId}:${name}`, id);
    }
    const rankingImport = await importRankingsSheetToDraft({
      supabase: supabase as never,
      sheet: sheets.rankings,
      userId: user?.id ?? null,
      serviceIdByKey,
      planIdByKey,
    });
    if (!rankingImport.ok) {
      return { ok: false, message: rankingImport.message };
    }

    const built = buildMultiSheetDiffs({
      db,
      services: sheets.services,
      plans: sheets.plans,
      comparisonItems: sheets.comparisonItems,
    });

    const status = getSheetsConfigStatus();
    const { data: session, error: sessionErr } = await supabase
      .from("spreadsheet_sync_runs")
      .insert({
        sync_type: "spreadsheet_import",
        source: "google_sheets",
        status: "awaiting_review" as SpreadsheetSyncStatus,
        spreadsheet_id: status.sheetId,
        started_at: new Date().toISOString(),
        total_rows:
          sheets.services.rows.length +
          sheets.plans.rows.length +
          sheets.comparisonItems.rows.length,
        added_count: built.summary.added,
        changed_count: built.summary.changed,
        unchanged_count: built.summary.unchanged,
        error_count: built.summary.error + built.errors.length,
        warning_count: built.summary.warning,
        difference_count: built.summary.changed + built.summary.added,
        target_service_ids: [
          ...new Set(
            built.diffs
              .map((d) => d.serviceId)
              .filter((id): id is string => Boolean(id)),
          ),
        ],
        message: `取得完了: 変更${built.summary.changed} / 追加${built.summary.added} / エラー${built.summary.error}`,
        meta: {
          summary: built.summary,
          warnings: built.warnings,
          spreadsheetTitle: sheets.spreadsheetTitle,
        } as never,
        created_by: user?.id ?? null,
      })
      .select("*")
      .single();

    if (sessionErr || !session) {
      console.error("import session insert", sessionErr?.message);
      return {
        ok: false,
        message: "同期セッションの保存に失敗しました。マイグレーションを確認してください。",
      };
    }

    const changeRows = built.diffs.map((d) => ({
      sync_run_id: session.id,
      sheet_name: d.sheetName,
      table_name: d.tableName,
      record_id: d.recordId || null,
      record_slug: d.recordSlug || null,
      service_id: d.serviceId || null,
      service_slug: d.serviceSlug || null,
      service_name: d.serviceName || null,
      plan_name: d.planName || null,
      field_name: d.fieldName,
      old_value: d.oldValue as never,
      new_value: d.newValue as never,
      change_type: d.changeType,
      selected: false,
      status: "pending" as const,
      error_message: d.errorMessage ?? null,
      warning: d.warning ?? null,
      row_number: d.rowNumber,
    }));

    // Insert in chunks
    for (let i = 0; i < changeRows.length; i += 200) {
      const chunk = changeRows.slice(i, i + 200);
      if (!chunk.length) continue;
      const { error } = await supabase
        .from("spreadsheet_sync_changes")
        .insert(chunk);
      if (error) {
        console.error("sync_changes insert", error.message);
      }
    }

    if (built.errors.length) {
      await supabase.from("spreadsheet_sync_errors").insert(
        built.errors.map((e) => ({
          session_id: session.id,
          sheet_name: e.sheetName,
          row_number: e.rowNumber,
          record_id: e.recordId || null,
          error_code: e.errorCode,
          message: e.message,
          raw_data: (e.rawData ?? null) as never,
        })),
      );
    }

    revalidatePath("/admin/spreadsheet");
    return {
      ok: true,
      message: "スプレッドシートから取得しました（公開DBは未更新）",
      data: {
        sessionId: session.id,
        summary: {
          ...summarizeDiffs(built.diffs),
          okRows: built.summary.okRows,
          warning: built.summary.warning,
        },
        warnings: built.warnings,
        errorCount: built.errors.length,
      },
    };
  } catch (e) {
    console.error("importFromGoogleSheetsAction", e);
    return {
      ok: false,
      message:
        e instanceof Error
          ? e.message
          : "スプレッドシートからの取得に失敗しました",
    };
  }
}

export async function getSessionDiffsAction(
  sessionId: string,
): Promise<
  SpreadsheetActionResult<{
    session: SpreadsheetSyncRun;
    diffs: SpreadsheetDiffItem[];
    errors: Array<{
      sheetName: string;
      rowNumber: number;
      recordId: string;
      message: string;
    }>;
  }>
> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };

  const { data: session } = await supabase
    .from("spreadsheet_sync_runs")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return { ok: false, message: "同期セッションが見つかりません" };
  }

  const { data: changes } = await supabase
    .from("spreadsheet_sync_changes")
    .select("*")
    .eq("sync_run_id", sessionId)
    .order("created_at", { ascending: true });

  const { data: errRows } = await supabase
    .from("spreadsheet_sync_errors")
    .select("sheet_name, row_number, record_id, message")
    .eq("session_id", sessionId)
    .limit(100);

  return {
    ok: true,
    message: "ok",
    data: {
      session: session as SpreadsheetSyncRun,
      diffs: (changes ?? []).map((c) =>
        mapChangeToDiff(c as SpreadsheetSyncChange),
      ),
      errors: (errRows ?? []).map((e) => ({
        sheetName: e.sheet_name ?? "",
        rowNumber: e.row_number ?? 0,
        recordId: e.record_id ?? "",
        message: e.message,
      })),
    },
  };
}

export async function getHistoryDetailAction(
  sessionId: string,
): Promise<
  SpreadsheetActionResult<{
    session: SpreadsheetSyncRun;
    changes: Array<{
      id: string;
      sheetName: string;
      tableName: string;
      recordId: string;
      fieldName: string;
      oldValue: string;
      newValue: string;
      changeType: string;
      status: string;
      errorMessage: string | null;
      serviceName: string;
      planName: string;
    }>;
  }>
> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };

  const { data: session } = await supabase
    .from("spreadsheet_sync_runs")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { ok: false, message: "履歴が見つかりません" };

  const { data: changes } = await supabase
    .from("spreadsheet_sync_changes")
    .select("*")
    .eq("sync_run_id", sessionId)
    .neq("change_type", "unchanged")
    .order("created_at", { ascending: true })
    .limit(500);

  return {
    ok: true,
    message: "ok",
    data: {
      session: session as SpreadsheetSyncRun,
      changes: (changes ?? []).map((c) => ({
        id: c.id,
        sheetName: c.sheet_name ?? "",
        tableName: c.table_name ?? "",
        recordId: c.record_id ?? "",
        fieldName: c.field_name,
        oldValue: formatDiffValue(c.old_value as never),
        newValue: formatDiffValue(c.new_value as never),
        changeType: c.change_type,
        status: c.status,
        errorMessage: c.error_message,
        serviceName: c.service_name ?? "",
        planName: c.plan_name ?? "",
      })),
    },
  };
}

export async function applySelectedChangesAction(params: {
  sessionId: string;
  changeIds: string[];
}): Promise<
  SpreadsheetActionResult<{
    applied: number;
    errorCount: number;
    canRetry: boolean;
    lastFailedChangeId?: string;
  }>
> {
  const { supabase, admin, user } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };

  if (!params.changeIds.length) {
    return { ok: false, message: "反映する変更を選択してください。" };
  }

  try {
    const result = await applySessionChanges({
      supabase,
      sessionId: params.sessionId,
      changeIds: params.changeIds,
      userId: user?.id ?? null,
    });

    await revalidateTouchedServices(result.touchedServiceIds);

    return {
      ok: result.errors.length === 0,
      message:
        result.errors.length === 0
          ? `${result.applied}件を反映しました`
          : `${result.applied}件反映、${result.errors.length}件エラー`,
      data: {
        applied: result.applied,
        errorCount: result.errors.length,
        canRetry: result.canRetry,
        lastFailedChangeId: result.lastFailedChangeId,
      },
    };
  } catch (e) {
    console.error("applySelectedChangesAction", e);
    return {
      ok: false,
      message: "DB更新に失敗しました",
    };
  }
}

export async function testGoogleSheetsConnectionAction(): Promise<
  SpreadsheetActionResult<Awaited<ReturnType<typeof testSheetsConnection>>>
> {
  const { supabase, admin, user } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };
  if (!hasGoogleSheetsEnv()) {
    return {
      ok: false,
      message: "環境変数が不足しています",
      data: {
        ok: false,
        steps: {
          auth: "fail",
          spreadsheet: "skip",
          read: "skip",
          write: "skip",
        },
        errorCode: "auth",
        message: `未設定: ${getSheetsConfigStatus().missing.join(", ")}`,
      },
    };
  }

  const result = await testSheetsConnection();
  await supabase.from("spreadsheet_sync_runs").insert({
    sync_type: "connection_test",
    source: "google_sheets",
    status: result.ok ? "success" : "failed",
    message: result.message,
    meta: { steps: result.steps, errorCode: result.errorCode } as never,
    created_by: user?.id ?? null,
    completed_at: new Date().toISOString(),
  });

  return { ok: result.ok, message: result.message, data: result };
}

export async function rollbackSyncRunAction(
  runId: string,
): Promise<SpreadsheetActionResult<{ applied: number }>> {
  const { supabase, admin, user } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };

  try {
    const result = await rollbackSyncRun({
      supabase,
      runId,
      userId: user?.id ?? null,
    });
    await revalidateTouchedServices(result.touchedServiceIds);
    return {
      ok: result.errors.length === 0 && result.applied > 0,
      message: result.message,
      data: { applied: result.applied },
    };
  } catch (e) {
    console.error("rollbackSyncRunAction", e);
    return { ok: false, message: "ロールバックに失敗しました" };
  }
}

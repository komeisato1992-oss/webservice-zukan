"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { buildScrapeDiff } from "@/lib/scraping/diff";
import { isScrapingSupported } from "@/lib/scraping/catalog";
import { applyManualLocksToScrapeDiffs } from "@/lib/spreadsheet/locks";
import type { ScrapedServiceData, ScrapeDiffItem } from "@/lib/scraping/types";
import type { Database, Json } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { insertArticleCandidateFromScrape } from "@/lib/actions/contents";

async function withManualLocks(
  supabase: SupabaseClient<Database>,
  serviceId: string,
  diffs: ScrapeDiffItem[],
): Promise<ScrapeDiffItem[]> {
  try {
    const { data, error } = await supabase
      .from("service_field_overrides")
      .select("field_name")
      .eq("service_id", serviceId)
      .eq("manual_override", true);
    if (error) return diffs;
    const locked = new Set((data ?? []).map((r) => r.field_name));
    return applyManualLocksToScrapeDiffs(diffs, locked);
  } catch {
    return diffs;
  }
}

export type ScrapingActionResult = {
  ok: boolean;
  message: string;
  runId?: string;
  status?: string;
  provider?: string | null;
  fetchedAt?: string | null;
  sourceUrls?: string[];
  warnings?: string[];
  diffs?: ScrapeDiffItem[];
  recentWithinMinutes?: boolean;
  durationMs?: number | null;
  foundCount?: number | null;
  missingCount?: number | null;
  warningCount?: number | null;
  /** Provider 未対応（エラーではない） */
  unsupported?: boolean;
  errorCode?: string | null;
  shortReason?: string | null;
  detailMessage?: string | null;
};

function countFound(data: ScrapedServiceData) {
  const planFound = data.plans.reduce((acc, plan) => {
    const fields = [
      plan.name,
      plan.regularMonthlyPrice,
      plan.campaignMonthlyPrice,
      plan.effectiveMonthlyPrice,
      plan.initialFee,
      plan.billingPeriod,
      plan.storageValue,
      plan.storageUnit,
    ];
    return acc + fields.filter((f) => f.status === "found").length;
  }, 0);
  const planMissing = data.plans.reduce((acc, plan) => {
    const fields = [
      plan.name,
      plan.regularMonthlyPrice,
      plan.campaignMonthlyPrice,
      plan.effectiveMonthlyPrice,
      plan.initialFee,
      plan.billingPeriod,
      plan.storageValue,
      plan.storageUnit,
    ];
    return (
      acc +
      fields.filter((f) => f.status === "not_found" || f.status === "error")
        .length
    );
  }, 0);
  return {
    foundCount:
      planFound + data.comparisonValues.filter((c) => c.status === "found").length,
    missingCount:
      planMissing +
      data.comparisonValues.filter(
        (c) => c.status === "not_found" || c.status === "error",
      ).length,
  };
}

export async function getLatestScrapingRunAction(
  serviceId: string,
): Promise<ScrapingActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "管理者権限が必要です。" };
  }

  const { data: run, error } = await supabase
    .from("scraping_runs")
    .select("*")
    .eq("service_id", serviceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }
  if (!run) {
    return { ok: true, message: "取得履歴はまだありません。" };
  }

  const [{ data: plans }, { data: service }, { data: values }] =
    await Promise.all([
      supabase
        .from("service_plans")
        .select("*")
        .eq("service_id", serviceId)
        .order("display_order", { ascending: true }),
      supabase
        .from("services")
        .select("category_id")
        .eq("id", serviceId)
        .maybeSingle(),
      supabase
        .from("comparison_values")
        .select("*")
        .eq("service_id", serviceId)
        .is("plan_id", null),
    ]);

  let diffs: ScrapeDiffItem[] = [];
  if (run.result_json && service) {
    const { data: fields } = await supabase
      .from("comparison_fields")
      .select("*")
      .eq("category_id", service.category_id)
      .eq("is_published", true)
      .order("display_order", { ascending: true });

    diffs = buildScrapeDiff({
      scraped: run.result_json as ScrapedServiceData,
      plans: plans ?? [],
      comparisonFields: fields ?? [],
      comparisonValues: values ?? [],
    });
    diffs = await withManualLocks(supabase, serviceId, diffs);
  }

  const recentWithinMinutes =
    Date.now() - new Date(run.created_at).getTime() < 10 * 60 * 1000;

  const warnings = (run.warnings as string[]) ?? [];

  return {
    ok: true,
    message: "最新の取得結果を読み込みました。",
    runId: run.id,
    status: run.status,
    provider: run.provider,
    fetchedAt: run.completed_at ?? run.created_at,
    sourceUrls: (run.source_urls as string[]) ?? [],
    warnings,
    diffs,
    recentWithinMinutes,
    durationMs: run.duration_ms,
    foundCount: run.found_count,
    missingCount: run.missing_count,
    warningCount: warnings.length,
  };
}

export async function runOfficialInfoScraperAction(input: {
  serviceId: string;
  force?: boolean;
}): Promise<ScrapingActionResult> {
  const { supabase, admin, user } = await requireAdmin();
  if (!admin || !user) {
    return { ok: false, message: "管理者権限が必要です。" };
  }

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, slug, official_url, category_id, name")
    .eq("id", input.serviceId)
    .maybeSingle();

  if (serviceError || !service) {
    return { ok: false, message: "サービスが見つかりません。" };
  }

  if (!isScrapingSupported(service.slug)) {
    // 未対応はエラーにせず、案内メッセージのみ返す
    return {
      ok: true,
      message: "このサービスはまだ公式情報取得に対応していません。",
      unsupported: true,
      provider: null,
    };
  }

  if (!input.force) {
    const { data: latest } = await supabase
      .from("scraping_runs")
      .select("id, created_at")
      .eq("service_id", service.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      latest &&
      Date.now() - new Date(latest.created_at).getTime() < 10 * 60 * 1000
    ) {
      return {
        ok: false,
        message:
          "直近10分以内に取得済みです。再取得する場合は確認のうえ再実行してください。",
        runId: latest.id,
        recentWithinMinutes: true,
      };
    }
  }

  const { data: running } = await supabase
    .from("scraping_runs")
    .select("id")
    .eq("service_id", service.id)
    .eq("status", "running")
    .maybeSingle();

  if (running) {
    return {
      ok: false,
      message: "このサービスの取得処理が実行中です。完了までお待ちください。",
      runId: running.id,
    };
  }

  const { data: runRow, error: insertError } = await supabase
    .from("scraping_runs")
    .insert({
      service_id: service.id,
      provider: service.slug,
      status: "running",
      started_at: new Date().toISOString(),
      created_by: user.id,
      source_urls: [],
      warnings: [],
    })
    .select("id")
    .single();

  if (insertError || !runRow) {
    return {
      ok: false,
      message: `取得履歴の作成に失敗しました: ${insertError?.message ?? ""}`,
    };
  }

  // Playwright は動的 import（バンドル分離・将来ワーカー切替しやすい）
  const { runOfficialScraper } = await import("@/lib/scraping/run-scraper");
  const result = await runOfficialScraper({
    serviceId: service.id,
    serviceSlug: service.slug,
    officialUrl: service.official_url,
  });

  const [{ data: plans }, { data: fields }, { data: values }] =
    await Promise.all([
      supabase
        .from("service_plans")
        .select("*")
        .eq("service_id", service.id)
        .order("display_order", { ascending: true }),
      supabase
        .from("comparison_fields")
        .select("*")
        .eq("category_id", service.category_id)
        .eq("is_published", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("comparison_values")
        .select("*")
        .eq("service_id", service.id)
        .is("plan_id", null),
    ]);

  let diffs: ScrapeDiffItem[] = [];
  let status: "success" | "partial" | "failed" = "failed";
  let warnings: string[] = [];
  let sourceUrls: string[] = [];
  let foundCount = 0;
  let missingCount = 0;

  if (result.data) {
    const counts = countFound(result.data);
    foundCount = counts.foundCount;
    missingCount = counts.missingCount;
    warnings = result.data.warnings;
    sourceUrls = result.data.sourceUrls;
    diffs = buildScrapeDiff({
      scraped: result.data,
      plans: plans ?? [],
      comparisonFields: fields ?? [],
      comparisonValues: values ?? [],
    });
    diffs = await withManualLocks(supabase, service.id, diffs);

    if (result.ok && missingCount === 0 && warnings.length === 0) {
      status = "success";
    } else if (result.ok || foundCount > 0) {
      status = "partial";
    } else {
      status = "failed";
    }
  }

  const { error: updateError } = await supabase
    .from("scraping_runs")
    .update({
      status,
      completed_at: new Date().toISOString(),
      source_urls: sourceUrls,
      result_json: (result.data as unknown as Json) ?? null,
      warnings,
      error_message: result.errorMessage,
      found_count: foundCount,
      missing_count: missingCount,
      duration_ms: result.durationMs,
      provider:
        typeof result.log.provider === "string"
          ? result.log.provider
          : service.slug,
    })
    .eq("id", runRow.id);

  if (updateError) {
    console.error("[scraping] failed to update run", updateError.message);
    return {
      ok: false,
      message: "取得は完了しましたが、結果の保存に失敗しました。",
      runId: runRow.id,
    };
  }

  revalidatePath(`/admin/services/${service.id}`);
  revalidatePath("/admin/scraping");

  // Diff → scraping_candidates（ドラフト確認用。自動公開しない）
  if ((status === "success" || status === "partial") && diffs.length > 0) {
    try {
      const { persistScrapingCandidates } = await import(
        "@/lib/cms/scraping-candidates"
      );
      const saved = await persistScrapingCandidates(supabase, {
        serviceId: service.id,
        scrapingRunId: runRow.id,
        diffs,
      });
      if (saved > 0) {
        await supabase
          .from("services")
          .update({
            has_unpublished_changes: true,
            last_change_source: "scraping",
            draft_updated_at: new Date().toISOString(),
          })
          .eq("id", service.id);
      }
    } catch (e) {
      console.warn(
        "[scraping] candidates persist skipped:",
        e instanceof Error ? e.message : e,
      );
    }
  }

  // 成功・一部成功時のみ記事候補を作成（自動公開はしない）
  if (
    (status === "success" || status === "partial") &&
    result.data &&
    user
  ) {
    try {
      await insertArticleCandidateFromScrape(supabase, {
        serviceId: service.id,
        serviceName: service.name,
        scrapingRunId: runRow.id,
        resultJson: result.data,
        sourceUrls,
        warnings,
        userId: user.id,
      });
    } catch (e) {
      console.warn(
        "[scraping] article candidate skipped:",
        e instanceof Error ? e.message : e,
      );
    }
  }

  if (status === "failed") {
    const detail =
      typeof result.log.errorDetail === "string"
        ? result.log.errorDetail.slice(0, 400)
        : null;
    return {
      ok: false,
      message: result.errorMessage ?? "公式情報の取得に失敗しました。",
      runId: runRow.id,
      status,
      provider:
        typeof result.log.provider === "string"
          ? result.log.provider
          : service.slug,
      fetchedAt: new Date().toISOString(),
      sourceUrls,
      warnings,
      diffs,
      durationMs: result.durationMs,
      foundCount,
      missingCount,
      warningCount: warnings.length,
      errorCode: result.errorCode,
      shortReason: result.shortReason,
      detailMessage: detail,
    };
  }

  return {
    ok: true,
    message:
      status === "success"
        ? "公式情報を取得しました。"
        : "公式情報を取得しました（一部項目は要確認）。",
    runId: runRow.id,
    status,
    provider:
      typeof result.log.provider === "string"
        ? result.log.provider
        : service.slug,
    fetchedAt: new Date().toISOString(),
    sourceUrls,
    warnings,
    diffs,
    durationMs: result.durationMs,
    foundCount,
    missingCount,
    warningCount: warnings.length,
    errorCode: null,
    shortReason: null,
    detailMessage: null,
  };
}

export async function discardScrapingRunAction(
  runId: string,
): Promise<ScrapingActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "管理者権限が必要です。" };
  }

  const { error } = await supabase
    .from("scraping_runs")
    .delete()
    .eq("id", runId);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "取得結果を破棄しました。" };
}

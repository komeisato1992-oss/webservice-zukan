import {
  COMPARISON_ITEM_FIELD_MAP,
  COMPARISON_LAYOUT_FIELDS,
  PLAN_FIELD_MAP,
  SERVICE_FIELD_MAP,
  type SheetFieldDef,
} from "@/lib/spreadsheet/fields";

const COMPARISON_LAYOUT_FIELD_MAP = Object.fromEntries(
  COMPARISON_LAYOUT_FIELDS.map((f) => [f.key, f]),
) as Record<string, SheetFieldDef>;
import type { CellValue } from "@/lib/spreadsheet/cells";
import type {
  Database,
  SpreadsheetSyncChange,
} from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureServiceDraft, saveServiceDraft } from "@/lib/cms/drafts";
import { applyPlanFieldValue } from "@/lib/cms/plans";
import {
  normalizeAffiliateNetwork,
  normalizeAffiliateStatus,
  tryNormalizeAffiliateUrl,
} from "@/lib/site/affiliate";

type AdminClient = SupabaseClient<Database>;

export type ApplyResult = {
  applied: number;
  errors: { changeId: string; message: string }[];
  touchedServiceIds: string[];
  lastFailedChangeId?: string;
  canRetry: boolean;
};

function fieldDef(
  sheetName: string | null | undefined,
  fieldName: string,
): SheetFieldDef | undefined {
  if (sheetName === "plans") return PLAN_FIELD_MAP[fieldName];
  if (sheetName === "comparison_layout") {
    return COMPARISON_LAYOUT_FIELD_MAP[fieldName];
  }
  if (
    sheetName === "comparison_items" ||
    sheetName === "comparison_fields"
  ) {
    return COMPARISON_ITEM_FIELD_MAP[fieldName];
  }
  return SERVICE_FIELD_MAP[fieldName];
}

async function applyOneChange(
  supabase: AdminClient,
  change: SpreadsheetSyncChange,
): Promise<void> {
  const def = fieldDef(change.sheet_name ?? null, change.field_name);
  if (!def || def.readonly || def.identity) {
    throw new Error("更新できない項目です");
  }

  const newValue = change.new_value as CellValue;

  if (def.target.table === "services") {
    const serviceId = change.service_id ?? change.record_id;
    if (!serviceId) throw new Error("service_id がありません");
    const column = def.target.column;
    let value: unknown = newValue;

    if (column === "affiliate_url") {
      const checked = tryNormalizeAffiliateUrl(
        newValue == null ? "" : String(newValue),
      );
      if (!checked.ok) throw new Error(checked.message);
      value = checked.url;
    } else if (column === "affiliate_network") {
      value = normalizeAffiliateNetwork(
        newValue == null ? null : String(newValue),
      );
    } else if (column === "affiliate_status") {
      value = normalizeAffiliateStatus(
        newValue == null ? null : String(newValue),
      );
    }

    const patch: Record<string, unknown> = {
      [column]: value,
    };
    if (column === "is_published") {
      patch.status = value === true ? "published" : "draft";
    }
    // Keep primary_link_url in sync for older resolvers (optional)
    if (column === "affiliate_url") {
      patch.primary_link_url = value;
    }
    const { error } = await supabase
      .from("services")
      .update(patch as never)
      .eq("id", serviceId);
    if (error) throw error;
    return;
  }

  if (def.target.table === "service_plans") {
    const planId = change.record_id;
    if (!planId) throw new Error("plan_id がありません");
    const planColumn = def.target.column;

    // Resolve service_id from change or live plan row
    let serviceId = change.service_id;
    if (!serviceId) {
      const { data: planRow } = await supabase
        .from("service_plans")
        .select("service_id")
        .eq("id", planId)
        .maybeSingle();
      serviceId = planRow?.service_id ?? null;
    }
    if (!serviceId) throw new Error("service_id がありません");

    // Sheets → plan draft only (never publish live until CMS publish)
    const draft = await ensureServiceDraft(supabase, serviceId);
    if (!draft) throw new Error("プランドラフトを用意できませんでした");

    let plans = draft.payload.plans.map((p) => {
      if (String(p.id) !== planId) {
        if (planColumn === "is_default_comparison_plan" && newValue === true) {
          return { ...p, is_default_comparison_plan: false };
        }
        return p;
      }
      return applyPlanFieldValue(p, planColumn, newValue);
    });

    // If plan missing from draft (edge), seed from live then patch
    if (!plans.some((p) => String(p.id) === planId)) {
      const { data: livePlan } = await supabase
        .from("service_plans")
        .select("*")
        .eq("id", planId)
        .maybeSingle();
      if (!livePlan) throw new Error("プランが見つかりません");
      plans = [
        ...plans,
        applyPlanFieldValue(
          livePlan as unknown as Record<string, unknown>,
          planColumn,
          newValue,
        ),
      ];
    }

    const save = await saveServiceDraft(
      supabase,
      serviceId,
      { ...draft.payload, plans },
      "google_sheets",
      null,
    );
    if (!save.ok) throw new Error(save.message);
    return;
  }

  if (def.target.table === "comparison_fields") {
    const fieldId = change.record_id;
    if (!fieldId) throw new Error("comparison_item_id がありません");

    if (def.target.column === "field_type") {
      const allowed = ["boolean", "number", "text", "select", "rating"];
      if (newValue != null && !allowed.includes(String(newValue))) {
        throw new Error("表示形式の値が不正です");
      }
    }

    const { error } = await supabase
      .from("comparison_fields")
      .update({ [def.target.column]: newValue } as never)
      .eq("id", fieldId);
    if (error) throw error;
    return;
  }

  if (def.target.table === "comparison_values") {
    const serviceId = change.service_id ?? change.record_id;
    if (!serviceId) throw new Error("service_id がありません");

    const { data: service, error: svcErr } = await supabase
      .from("services")
      .select("id, category_id")
      .eq("id", serviceId)
      .maybeSingle();
    if (svcErr) throw svcErr;
    if (!service) throw new Error("サービスが見つかりません");

    const { data: field, error: fieldErr } = await supabase
      .from("comparison_fields")
      .select("id, field_type, slug")
      .eq("slug", def.target.fieldSlug)
      .eq("category_id", service.category_id)
      .maybeSingle();
    if (fieldErr) throw fieldErr;
    if (!field) {
      throw new Error(
        `比較項目「${def.target.fieldSlug}」が未登録です。マイグレーションを適用してください。`,
      );
    }

    const { data: existing } = await supabase
      .from("comparison_values")
      .select("id")
      .eq("service_id", serviceId)
      .eq("comparison_field_id", field.id)
      .is("plan_id", null)
      .maybeSingle();

    // __CLEAR__ / null → 行削除（未確認）
    if (newValue == null) {
      if (existing) {
        const { error } = await supabase
          .from("comparison_values")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
      }
      return;
    }

    const payload =
      def.target.valueKind === "boolean"
        ? {
            boolean_value: Boolean(newValue),
            number_value: null,
            text_value: null,
          }
        : {
            boolean_value: null,
            number_value: null,
            text_value: String(newValue),
          };

    if (existing) {
      const { error } = await supabase
        .from("comparison_values")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("comparison_values").insert({
        service_id: serviceId,
        plan_id: null,
        comparison_field_id: field.id,
        ...payload,
      });
      if (error) throw error;
    }
    return;
  }

  throw new Error("未対応の更新先です");
}

/**
 * Apply selected changes from a sync session.
 * Reads values from DB change rows (not client-supplied payloads).
 */
export async function applySessionChanges(params: {
  supabase: AdminClient;
  sessionId: string;
  changeIds: string[];
  userId: string | null;
}): Promise<ApplyResult> {
  const { supabase, sessionId, changeIds, userId } = params;

  const { data: session, error: sessionErr } = await supabase
    .from("spreadsheet_sync_runs")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionErr || !session) {
    return {
      applied: 0,
      errors: [{ changeId: "", message: "同期セッションが見つかりません" }],
      touchedServiceIds: [],
      canRetry: false,
    };
  }

  if (session.status === "applied" || session.status === "success") {
    return {
      applied: 0,
      errors: [
        {
          changeId: "",
          message: "この同期セッションは既に反映済みです",
        },
      ],
      touchedServiceIds: [],
      canRetry: false,
    };
  }

  if (session.status === "applying") {
    return {
      applied: 0,
      errors: [
        {
          changeId: "",
          message: "他の同期処理が実行中です",
        },
      ],
      touchedServiceIds: [],
      canRetry: true,
    };
  }

  if (!["awaiting_review", "fetched", "partial", "failed"].includes(session.status)) {
    return {
      applied: 0,
      errors: [
        {
          changeId: "",
          message: "反映可能な状態のセッションではありません",
        },
      ],
      touchedServiceIds: [],
      canRetry: false,
    };
  }

  // Claim session
  const { data: claimed, error: claimErr } = await supabase
    .from("spreadsheet_sync_runs")
    .update({
      status: "applying",
      started_at: session.started_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .in("status", ["awaiting_review", "fetched", "partial", "failed"])
    .select("id")
    .maybeSingle();

  if (claimErr || !claimed) {
    console.error("claim session failed", claimErr?.message);
    return {
      applied: 0,
      errors: [
        {
          changeId: "",
          message: "他の同期処理が実行中か、セッション状態が変わりました",
        },
      ],
      touchedServiceIds: [],
      canRetry: true,
    };
  }

  const idSet = new Set(changeIds);
  const { data: changes, error: changesErr } = await supabase
    .from("spreadsheet_sync_changes")
    .select("*")
    .eq("sync_run_id", sessionId)
    .in("id", changeIds);

  if (changesErr || !changes) {
    await supabase
      .from("spreadsheet_sync_runs")
      .update({ status: "failed", message: "変更行の取得に失敗しました" })
      .eq("id", sessionId);
    return {
      applied: 0,
      errors: [{ changeId: "", message: "変更行の取得に失敗しました" }],
      touchedServiceIds: [],
      canRetry: true,
    };
  }

  const toApply = changes.filter(
    (c) =>
      idSet.has(c.id) &&
      c.change_type !== "error" &&
      c.change_type !== "unchanged" &&
      c.status !== "applied",
  );

  // Mark selected
  await supabase
    .from("spreadsheet_sync_changes")
    .update({ selected: true, status: "selected" })
    .in(
      "id",
      toApply.map((c) => c.id),
    );

  const errors: ApplyResult["errors"] = [];
  let applied = 0;
  const touched = new Set<string>();
  let lastFailedChangeId: string | undefined;

  // Snapshot published baselines before mutating live rows
  {
    const { ensureServiceDraft } = await import("@/lib/cms/drafts");
    const preIds = new Set<string>();
    for (const change of toApply) {
      if (change.service_id) preIds.add(change.service_id);
      else if (change.sheet_name === "services" && change.record_id) {
        preIds.add(change.record_id);
      }
    }
    for (const id of preIds) {
      await ensureServiceDraft(supabase, id);
    }
  }

  for (const change of toApply) {
    try {
      await applyOneChange(supabase, change as SpreadsheetSyncChange);
      await supabase
        .from("spreadsheet_sync_changes")
        .update({
          status: "applied",
          applied_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", change.id);
      applied += 1;
      if (change.service_id) touched.add(change.service_id);
      else if (change.sheet_name === "services" && change.record_id) {
        touched.add(change.record_id);
      }

      // Manual lock for service fields
      if (change.service_id && change.sheet_name === "services") {
        await upsertFieldOverride(supabase, {
          serviceId: change.service_id,
          fieldName: change.field_name,
          manualValue: change.new_value,
          userId,
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "更新に失敗しました";
      console.error("apply change failed", change.id, message);
      lastFailedChangeId = change.id;
      errors.push({ changeId: change.id, message: "DB更新に失敗しました" });
      await supabase
        .from("spreadsheet_sync_changes")
        .update({
          status: "error",
          error_message: message,
        })
        .eq("id", change.id);
      await supabase.from("spreadsheet_sync_errors").insert({
        session_id: sessionId,
        sheet_name: change.sheet_name,
        row_number: change.row_number,
        record_id: change.record_id,
        error_code: "apply_failed",
        message,
        raw_data: {
          field_name: change.field_name,
          old_value: change.old_value,
          new_value: change.new_value,
        } as never,
      });
    }
  }

  // Import → draft: keep imported values in cms_service_drafts; restore live from published snapshot
  for (const serviceId of touched) {
    try {
      const { ensureServiceDraft, buildLivePayload, saveServiceDraft } =
        await import("@/lib/cms/drafts");
      const { applyPayloadToLive } = await import("@/lib/cms/publish");
      const before = await ensureServiceDraft(supabase, serviceId);
      const imported = await buildLivePayload(supabase, serviceId);
      if (!imported || !before) continue;

      if (before.published_snapshot) {
        await applyPayloadToLive(
          supabase,
          serviceId,
          before.published_snapshot,
          { publishFullDraft: true },
        );
      }

      await saveServiceDraft(
        supabase,
        serviceId,
        imported,
        "google_sheets",
        userId,
      );
    } catch (e) {
      console.error(
        "[spreadsheet] draft sync after apply failed",
        serviceId,
        e,
      );
    }
  }

  const finalStatus =
    errors.length === 0
      ? "applied"
      : applied > 0
        ? "partial"
        : "failed";

  await supabase
    .from("spreadsheet_sync_runs")
    .update({
      status: finalStatus,
      applied_count: applied,
      error_count: errors.length,
      completed_at: new Date().toISOString(),
      applied_at: new Date().toISOString(),
      message:
        errors.length === 0
          ? `${applied}件をドラフトへ反映しました（未公開）`
          : `${applied}件ドラフト反映、${errors.length}件失敗（最後の失敗: ${lastFailedChangeId ?? "-"}）`,
      meta: {
        ...(typeof session.meta === "object" && session.meta
          ? (session.meta as object)
          : {}),
        lastFailedChangeId,
        canRetry: errors.length > 0,
        appliedBy: userId,
        applyTarget: "draft",
      } as never,
    })
    .eq("id", sessionId);

  return {
    applied,
    errors,
    touchedServiceIds: [...touched],
    lastFailedChangeId,
    canRetry: errors.length > 0,
  };
}

async function upsertFieldOverride(
  supabase: AdminClient,
  params: {
    serviceId: string;
    fieldName: string;
    manualValue: unknown;
    userId: string | null;
  },
) {
  try {
    const { serviceId, fieldName, manualValue, userId } = params;
    const { data: existing } = await supabase
      .from("service_field_overrides")
      .select("id")
      .eq("service_id", serviceId)
      .eq("field_name", fieldName)
      .maybeSingle();

    const payload = {
      service_id: serviceId,
      field_name: fieldName,
      source_type: "imported" as const,
      manual_override: true,
      manual_value: manualValue as never,
      last_verified_at: new Date().toISOString(),
      verified_by: userId,
    };

    if (existing) {
      await supabase
        .from("service_field_overrides")
        .update(payload)
        .eq("id", existing.id);
    } else {
      await supabase.from("service_field_overrides").insert(payload);
    }
  } catch (e) {
    console.error("upsertFieldOverride failed", e);
  }
}

/** Legacy rollback: restore old_value from applied changes */
export async function rollbackSyncRun(params: {
  supabase: AdminClient;
  runId: string;
  userId: string | null;
}): Promise<ApplyResult & { message: string }> {
  const { supabase, runId } = params;

  const { data: run } = await supabase
    .from("spreadsheet_sync_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();

  if (!run || !["applied", "success", "partial"].includes(run.status)) {
    return {
      applied: 0,
      errors: [],
      touchedServiceIds: [],
      canRetry: false,
      message: "ロールバック可能な反映履歴ではありません",
    };
  }

  const { data: changes } = await supabase
    .from("spreadsheet_sync_changes")
    .select("*")
    .eq("sync_run_id", runId)
    .eq("status", "applied");

  if (!changes?.length) {
    return {
      applied: 0,
      errors: [],
      touchedServiceIds: [],
      canRetry: false,
      message: "ロールバック対象の変更がありません",
    };
  }

  let applied = 0;
  const errors: ApplyResult["errors"] = [];
  const touched = new Set<string>();

  for (const change of changes) {
    const reverse = {
      ...change,
      new_value: change.old_value,
      old_value: change.new_value,
    } as SpreadsheetSyncChange;
    try {
      await applyOneChange(supabase, reverse);
      await supabase
        .from("spreadsheet_sync_changes")
        .update({ status: "rolled_back" })
        .eq("id", change.id);
      applied += 1;
      if (change.service_id) touched.add(change.service_id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "失敗";
      errors.push({ changeId: change.id, message });
    }
  }

  await supabase
    .from("spreadsheet_sync_runs")
    .update({ status: "rolled_back", completed_at: new Date().toISOString() })
    .eq("id", runId);

  return {
    applied,
    errors,
    touchedServiceIds: [...touched],
    canRetry: false,
    message: `${applied} 件をロールバックしました`,
  };
}

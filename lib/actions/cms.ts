"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  discardServiceDraft,
  ensureServiceDraft,
  saveServiceDraft,
} from "@/lib/cms/drafts";
import { publishServiceDraft, type PublishSelection } from "@/lib/cms/publish";
import {
  applyPlanFieldValue,
  createDraftPlan,
  resolvePlanFieldKey,
} from "@/lib/cms/plans";
import type { CmsChangeSource, ServiceDraftPayload } from "@/lib/cms/types";
import type { ActionResult } from "@/lib/actions/admin";
import type { Json } from "@/lib/types/database";
import {
  normalizeAffiliateNetwork,
  normalizeAffiliateStatus,
  tryNormalizeAffiliateUrl,
} from "@/lib/site/affiliate";

function sanitizeServiceAffiliateFields(payload: ServiceDraftPayload): {
  ok: true;
  payload: ServiceDraftPayload;
} | { ok: false; message: string } {
  const service = { ...payload.service };
  const urlResult = tryNormalizeAffiliateUrl(
    service.affiliate_url == null ? "" : String(service.affiliate_url),
  );
  if (!urlResult.ok) return urlResult;
  service.affiliate_url = urlResult.url;
  service.primary_link_url = urlResult.url;
  service.affiliate_network = normalizeAffiliateNetwork(
    service.affiliate_network == null
      ? null
      : String(service.affiliate_network),
  );
  service.affiliate_status = normalizeAffiliateStatus(
    service.affiliate_status == null ? null : String(service.affiliate_status),
  );
  return { ok: true, payload: { ...payload, service } };
}

export async function saveServiceDraftAction(
  serviceId: string,
  payload: ServiceDraftPayload,
  source: CmsChangeSource = "admin",
): Promise<ActionResult & { changeCount?: number }> {
  const { supabase, admin, user } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };

  const sanitized = sanitizeServiceAffiliateFields(payload);
  if (!sanitized.ok) return { ok: false, message: sanitized.message };

  const result = await saveServiceDraft(
    supabase,
    serviceId,
    sanitized.payload,
    source,
    user?.id ?? null,
  );
  if (!result.ok) return result;

  revalidatePath(`/admin/services/${serviceId}`);
  revalidatePath("/admin/services");
  return {
    ok: true,
    message: `下書きを保存しました（未公開変更 ${result.changeCount} 件）。本番には未反映です。`,
    changeCount: result.changeCount,
  };
}

export async function discardServiceDraftAction(
  serviceId: string,
): Promise<ActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };

  const result = await discardServiceDraft(supabase, serviceId);
  if (!result.ok) return result;

  revalidatePath(`/admin/services/${serviceId}`);
  return { ok: true, message: "変更を破棄し、公開内容に戻しました。" };
}

export async function publishServiceDraftAction(
  serviceId: string,
  selection: PublishSelection = { publishFullDraft: true },
): Promise<ActionResult & { publishEventId?: string }> {
  const { supabase, admin, user } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };

  const draft = await ensureServiceDraft(supabase, serviceId);
  if (!draft) return { ok: false, message: "ドラフトが見つかりません。" };
  const sanitized = sanitizeServiceAffiliateFields(draft.payload);
  if (!sanitized.ok) return { ok: false, message: sanitized.message };
  if (sanitized.payload !== draft.payload) {
    const saved = await saveServiceDraft(
      supabase,
      serviceId,
      sanitized.payload,
      "admin",
      user?.id ?? null,
    );
    if (!saved.ok) return saved;
  }

  const result = await publishServiceDraft(
    supabase,
    serviceId,
    user?.id ?? null,
    selection,
  );
  if (!result.ok) return result;

  revalidatePath(`/admin/services/${serviceId}`);
  revalidatePath("/admin/services");
  revalidatePath("/admin/history");
  revalidatePath("/");
  return {
    ok: true,
    message: `公開へ反映しました（${result.changeCount} 件）。`,
    publishEventId: result.publishEventId,
  };
}

export async function getServiceDraftAction(serviceId: string) {
  const { supabase, admin } = await requireAdmin();
  if (!admin) return null;
  return ensureServiceDraft(supabase, serviceId);
}

function coerceCandidateValue(value: Json | null | undefined): unknown {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    const num = Number(trimmed);
    if (Number.isFinite(num) && /^-?\d+(\.\d+)?$/.test(trimmed)) return num;
    return trimmed;
  }
  return value;
}

export async function acceptScrapingCandidatesAction(
  candidateIds: string[],
  mode: "accept" | "reject" | "edit_accept",
  editedValue?: Json | null,
): Promise<ActionResult> {
  const { supabase, admin, user } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };
  if (!candidateIds.length) {
    return { ok: false, message: "候補が選択されていません。" };
  }

  const { data: candidates, error } = await supabase
    .from("scraping_candidates")
    .select(
      "id, service_id, plan_id, field_key, field_label, candidate_value, current_draft_value, status, evidence",
    )
    .in("id", candidateIds);

  if (error) return { ok: false, message: error.message };

  const now = new Date().toISOString();
  const status =
    mode === "reject"
      ? "rejected"
      : mode === "edit_accept"
        ? "edited_accepted"
        : "accepted";

  // Group by service so one draft save covers related new-plan fields
  const byService = new Map<string, typeof candidates>();
  for (const c of candidates ?? []) {
    const list = byService.get(c.service_id) ?? [];
    list.push(c);
    byService.set(c.service_id, list);
  }

  for (const [serviceId, serviceCandidates] of byService) {
    const draft = await ensureServiceDraft(supabase, serviceId);
    if (!draft) continue;

    const payload = structuredClone(draft.payload);
    const newPlanIds = new Map<string, string>(); // newPlanKey → planId

    for (const c of serviceCandidates) {
      const value =
        mode === "edit_accept" && editedValue !== undefined
          ? editedValue
          : c.candidate_value;

      await supabase
        .from("scraping_candidates")
        .update({
          status,
          candidate_value: mode === "edit_accept" ? value : c.candidate_value,
          reviewed_by: user?.id ?? null,
          reviewed_at: now,
        })
        .eq("id", c.id);

      if (mode === "reject") continue;

      const resolved = resolvePlanFieldKey(c.field_key);
      const coerced = coerceCandidateValue(value as Json);

      if (resolved.kind === "plan" && c.plan_id) {
        payload.plans = payload.plans.map((p) =>
          String(p.id) === c.plan_id
            ? applyPlanFieldValue(p, resolved.column, coerced)
            : p,
        );
      } else if (resolved.kind === "new_plan" && resolved.newPlanKey) {
        let planId = newPlanIds.get(resolved.newPlanKey);
        if (!planId) {
          const labelMatch = c.field_label?.match(/【(.+?)】/);
          const name =
            labelMatch?.[1] ??
            resolved.newPlanKey.replace(/-/g, " ") ??
            "新しいプラン";
          const taken = new Set(
            payload.plans
              .map((p) => (typeof p.slug === "string" ? p.slug : ""))
              .filter(Boolean),
          );
          const serviceSlug =
            typeof payload.service.slug === "string"
              ? payload.service.slug
              : null;
          const created = createDraftPlan(serviceId, {
            name,
            displayOrder: payload.plans.length,
            serviceSlug,
            takenSlugs: taken,
            seed: resolved.newPlanKey ? { slug: resolved.newPlanKey } : undefined,
          });
          planId = String(created.id);
          newPlanIds.set(resolved.newPlanKey, planId);
          payload.plans = [...payload.plans, created];
        }
        payload.plans = payload.plans.map((p) =>
          String(p.id) === planId
            ? applyPlanFieldValue(p, resolved.column, coerced)
            : p,
        );
      } else if (resolved.kind === "plan" && !c.plan_id) {
        // Legacy field_key without new_plan: prefix — create/update by evidence
        const isNew =
          typeof c.evidence === "string" &&
          c.evidence.includes("新規プラン候補");
        if (isNew) {
          const labelMatch = c.field_label?.match(/【(.+?)】/);
          const name = labelMatch?.[1] ?? "新しいプラン";
          const key = `legacy:${name}`;
          let planId = newPlanIds.get(key);
          if (!planId) {
            const taken = new Set(
              payload.plans
                .map((p) => (typeof p.slug === "string" ? p.slug : ""))
                .filter(Boolean),
            );
            const serviceSlug =
              typeof payload.service.slug === "string"
                ? payload.service.slug
                : null;
            const created = createDraftPlan(serviceId, {
              name,
              displayOrder: payload.plans.length,
              serviceSlug,
              takenSlugs: taken,
            });
            planId = String(created.id);
            newPlanIds.set(key, planId);
            payload.plans = [...payload.plans, created];
          }
          payload.plans = payload.plans.map((p) =>
            String(p.id) === planId
              ? applyPlanFieldValue(p, resolved.column, coerced)
              : p,
          );
        } else {
          const meta =
            (payload.service._pending_cmp as Record<string, unknown>) ?? {};
          meta[c.field_key] = coerced;
          payload.service = { ...payload.service, _pending_cmp: meta };
        }
      } else if (c.field_key.startsWith("service.")) {
        const col = c.field_key.slice(8);
        payload.service = { ...payload.service, [col]: coerced };
      } else {
        const meta =
          (payload.service._pending_cmp as Record<string, unknown>) ?? {};
        meta[c.field_key] = coerced;
        payload.service = { ...payload.service, _pending_cmp: meta };
      }

      await supabase.from("cms_change_items").insert({
        entity_type: resolved.kind === "other" ? "comparison_value" : "plan",
        entity_id: c.id,
        parent_service_id: serviceId,
        parent_plan_id: c.plan_id,
        field_key: c.field_key,
        field_label: c.field_label,
        old_value: c.current_draft_value,
        new_value: value,
        change_source: "scraping",
        status: "draft",
        selected_for_publish: true,
        changed_by: user?.id ?? null,
      });
    }

    if (mode !== "reject") {
      await saveServiceDraft(
        supabase,
        serviceId,
        payload,
        "scraping",
        user?.id ?? null,
      );
    }

    revalidatePath(`/admin/services/${serviceId}`);
  }

  revalidatePath("/admin/scraping");
  revalidatePath("/admin/services");
  return {
    ok: true,
    message:
      mode === "reject"
        ? "選択した候補を却下しました。"
        : "選択した候補をドラフトへ採用しました（未公開）。",
  };
}

export async function saveComparisonLayoutDraftAction(
  updates: {
    id: string;
    show_in_top_featured: boolean;
    show_in_top_table: boolean;
    show_in_compare_page: boolean;
    top_featured_display_order: number | null;
    top_table_display_order: number | null;
    compare_page_display_order: number | null;
  }[],
  publishNow: boolean,
): Promise<ActionResult> {
  const { supabase, admin, user } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };

  if (publishNow) {
    const { publishComparisonLayoutDrafts } = await import("@/lib/cms/publish");
    const result = await publishComparisonLayoutDrafts(
      supabase,
      user?.id ?? null,
      updates,
    );
    if (!result.ok) return result;
    revalidatePath("/admin/comparison-fields");
    revalidatePath("/");
    return { ok: true, message: "比較表の表示設定を公開しました。" };
  }

  for (const u of updates) {
    const { error } = await supabase
      .from("comparison_fields")
      .update({
        draft_show_in_top_featured: u.show_in_top_featured,
        draft_show_in_top_table: u.show_in_top_table,
        draft_show_in_compare_page: u.show_in_compare_page,
        has_unpublished_changes: true,
        publish_status: "pending_review",
      })
      .eq("id", u.id);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/admin/comparison-fields");
  return {
    ok: true,
    message: "表示設定を下書き保存しました。公開へ反映するまで本番には出ません。",
  };
}

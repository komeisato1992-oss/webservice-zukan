"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublicSiteCache } from "@/lib/site/cache";
import {
  comparisonFieldSchema,
  comparisonValuePayloadSchema,
  servicePlanSchema,
} from "@/lib/validations";
import { resolvePlanSlug } from "@/lib/cms/plan-slug";
import { isValidPlanSlug } from "@/lib/scraping/utils/text";
import type { FieldType } from "@/lib/types/database";

export type ActionResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

function formBoolean(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function revalidateServicePaths(serviceId: string) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: service } = await supabase
    .from("services")
    .select("slug, category_id")
    .eq("id", serviceId)
    .maybeSingle();

  revalidatePath(`/admin/services/${serviceId}`);
  revalidatePath("/admin/services");
  revalidatePath("/");
  revalidatePublicSiteCache();

  if (!service) return;

  const { data: category } = await supabase
    .from("categories")
    .select("slug")
    .eq("id", service.category_id)
    .maybeSingle();

  if (category?.slug && service.slug) {
    revalidatePath(`/${category.slug}`);
    revalidatePath(`/${category.slug}/services`);
    revalidatePath(`/${category.slug}/services/${service.slug}`);
  }
}

export async function saveServicePlanAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };

  const serviceId = formString(formData, "service_id");
  const id = formString(formData, "id") || null;
  if (!serviceId) return { ok: false, message: "サービスIDが不正です。" };

  const rawName = formString(formData, "name");
  const rawSlug = formString(formData, "slug");
  const [{ data: serviceRow }, { data: siblingPlans }] = await Promise.all([
    supabase.from("services").select("slug").eq("id", serviceId).maybeSingle(),
    supabase
      .from("service_plans")
      .select("id, slug")
      .eq("service_id", serviceId),
  ]);
  const taken = new Set(
    (siblingPlans ?? [])
      .filter((p) => !id || p.id !== id)
      .map((p) => p.slug)
      .filter(Boolean),
  );
  const resolvedSlug = resolvePlanSlug({
    name: rawName,
    currentSlug: rawSlug,
    serviceSlug: serviceRow?.slug,
    takenSlugs: taken,
    preferName: !isValidPlanSlug(rawSlug),
  });

  const parsed = servicePlanSchema.safeParse({
    name: rawName,
    slug: resolvedSlug,
    regular_monthly_price: formString(formData, "regular_monthly_price"),
    campaign_monthly_price: formString(formData, "campaign_monthly_price"),
    effective_monthly_price: formString(formData, "effective_monthly_price"),
    initial_fee: formString(formData, "initial_fee"),
    billing_period: formString(formData, "billing_period"),
    storage_value: formString(formData, "storage_value"),
    storage_unit: formString(formData, "storage_unit"),
    description: formString(formData, "description"),
    display_order: formString(formData, "display_order") || "0",
    is_published: formBoolean(formData, "is_published"),
    is_default_comparison_plan: formBoolean(
      formData,
      "is_default_comparison_plan",
    ),
    is_recommended: formBoolean(formData, "is_recommended"),
    official_url: formString(formData, "official_url"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "入力内容を確認してください。",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (parsed.data.is_default_comparison_plan) {
    const { error: clearError } = await supabase
      .from("service_plans")
      .update({ is_default_comparison_plan: false })
      .eq("service_id", serviceId)
      .eq("is_default_comparison_plan", true);
    if (clearError) return { ok: false, message: clearError.message };
  }

  if (id) {
    const { error } = await supabase
      .from("service_plans")
      .update(parsed.data)
      .eq("id", id)
      .eq("service_id", serviceId);
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await supabase.from("service_plans").insert({
      ...parsed.data,
      service_id: serviceId,
    });
    if (error) return { ok: false, message: error.message };
  }

  await revalidateServicePaths(serviceId);
  return { ok: true, message: "プランを保存しました。" };
}

export async function reorderServicePlanAction(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };

  const id = formString(formData, "id");
  const serviceId = formString(formData, "service_id");
  const direction = formString(formData, "direction");
  if (!id || !serviceId || (direction !== "up" && direction !== "down")) {
    return { ok: false, message: "並び替え対象が不正です。" };
  }

  const { data: plans, error: listError } = await supabase
    .from("service_plans")
    .select("id, display_order")
    .eq("service_id", serviceId)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (listError) return { ok: false, message: listError.message };
  const list = plans ?? [];
  const index = list.findIndex((p) => p.id === id);
  if (index < 0) return { ok: false, message: "プランが見つかりません。" };

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= list.length) {
    return { ok: true, message: "端のため移動しませんでした。" };
  }

  const reordered = [...list];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(swapIndex, 0, moved);

  for (let i = 0; i < reordered.length; i++) {
    const { error } = await supabase
      .from("service_plans")
      .update({ display_order: i * 10 })
      .eq("id", reordered[i].id)
      .eq("service_id", serviceId);
    if (error) return { ok: false, message: error.message };
  }

  await revalidateServicePaths(serviceId);
  return { ok: true, message: "プランの並び順を更新しました。" };
}

export async function setDefaultComparisonPlanAction(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };

  const id = formString(formData, "id");
  const serviceId = formString(formData, "service_id");
  if (!id || !serviceId) return { ok: false, message: "対象が不正です。" };

  const { error: clearError } = await supabase
    .from("service_plans")
    .update({ is_default_comparison_plan: false })
    .eq("service_id", serviceId);
  if (clearError) return { ok: false, message: clearError.message };

  const { error } = await supabase
    .from("service_plans")
    .update({ is_default_comparison_plan: true })
    .eq("id", id)
    .eq("service_id", serviceId);
  if (error) return { ok: false, message: error.message };

  await revalidateServicePaths(serviceId);
  return { ok: true, message: "代表プランを設定しました。" };
}

export async function deleteServicePlanAction(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };

  const id = formString(formData, "id");
  const serviceId = formString(formData, "service_id");
  if (!id || !serviceId) return { ok: false, message: "削除対象が不正です。" };

  const { error } = await supabase
    .from("service_plans")
    .delete()
    .eq("id", id)
    .eq("service_id", serviceId);

  if (error) return { ok: false, message: error.message };

  await revalidateServicePaths(serviceId);
  return { ok: true, message: "プランを削除しました。" };
}

export async function saveComparisonFieldAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };

  const id = formString(formData, "id") || null;
  const parsed = comparisonFieldSchema.safeParse({
    category_id: formString(formData, "category_id"),
    name: formString(formData, "name"),
    slug: formString(formData, "slug"),
    field_type: formString(formData, "field_type") || "text",
    unit: formString(formData, "unit"),
    description: formString(formData, "description"),
    display_group: formString(formData, "display_group"),
    select_options: formString(formData, "select_options"),
    display_order: formString(formData, "display_order") || "0",
    is_filterable: formBoolean(formData, "is_filterable"),
    is_highlighted: formBoolean(formData, "is_highlighted"),
    is_published: formBoolean(formData, "is_published"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "入力内容を確認してください。",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const payload = {
    ...parsed.data,
    select_options: parsed.data.select_options,
  };

  if (id) {
    const { error } = await supabase
      .from("comparison_fields")
      .update(payload)
      .eq("id", id);
    if (error) {
      if (error.code === "23505") {
        return {
          ok: false,
          message: "同じカテゴリ内でスラッグが重複しています。",
        };
      }
      return { ok: false, message: error.message };
    }
  } else {
    const { error } = await supabase.from("comparison_fields").insert(payload);
    if (error) {
      if (error.code === "23505") {
        return {
          ok: false,
          message: "同じカテゴリ内でスラッグが重複しています。",
        };
      }
      return { ok: false, message: error.message };
    }
  }

  revalidatePath("/admin/comparison-fields");
  revalidatePath("/");
  revalidatePublicSiteCache();
  return { ok: true, message: "比較項目を保存しました。" };
}

export async function deleteComparisonFieldAction(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };

  const id = formString(formData, "id");
  if (!id) return { ok: false, message: "削除対象が不正です。" };

  const { error } = await supabase.from("comparison_fields").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/comparison-fields");
  revalidatePath("/");
  revalidatePublicSiteCache();
  return { ok: true, message: "比較項目を削除しました。" };
}

export async function toggleComparisonFieldPublishAction(
  formData: FormData,
): Promise<void> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) return;

  const id = formString(formData, "id");
  const next = formString(formData, "is_published") === "true";
  if (!id) return;

  const { error } = await supabase
    .from("comparison_fields")
    .update({ is_published: next })
    .eq("id", id);

  if (error) return;

  revalidatePath("/admin/comparison-fields");
  revalidatePath("/");
  revalidatePublicSiteCache();
}

type ParsedValue = {
  boolean_value: boolean | null;
  number_value: number | null;
  text_value: string | null;
  hasValue: boolean;
};

function parseFieldValue(
  type: FieldType,
  formData: FormData,
  key: string,
): ParsedValue | { error: string } {
  const raw = formString(formData, key);

  if (type === "boolean") {
    // unset | true | false
    if (raw === "" || raw === "unset") {
      return {
        boolean_value: null,
        number_value: null,
        text_value: null,
        hasValue: false,
      };
    }
    const boolean_value = raw === "true" || raw === "1" || raw === "on";
    const checked = comparisonValuePayloadSchema.safeParse({
      field_type: "boolean",
      boolean_value,
    });
    if (!checked.success) {
      return { error: checked.error.issues[0]?.message ?? "真偽値が不正です。" };
    }
    return {
      boolean_value,
      number_value: null,
      text_value: null,
      hasValue: true,
    };
  }

  if (type === "number" || type === "rating") {
    if (raw.trim() === "") {
      return {
        boolean_value: null,
        number_value: null,
        text_value: null,
        hasValue: false,
      };
    }
    const n = Number(raw);
    if (Number.isNaN(n)) {
      return { error: "数値で入力してください。" };
    }
    const checked = comparisonValuePayloadSchema.safeParse({
      field_type: type,
      number_value: n,
    });
    if (!checked.success) {
      return { error: checked.error.issues[0]?.message ?? "数値が不正です。" };
    }
    return {
      boolean_value: null,
      number_value: n,
      text_value: null,
      hasValue: true,
    };
  }

  if (raw.trim() === "") {
    return {
      boolean_value: null,
      number_value: null,
      text_value: null,
      hasValue: false,
    };
  }

  const text_value = raw.trim();
  const checked = comparisonValuePayloadSchema.safeParse({
    field_type: type,
    text_value,
  });
  if (!checked.success) {
    return { error: checked.error.issues[0]?.message ?? "値が不正です。" };
  }

  return {
    boolean_value: null,
    number_value: null,
    text_value,
    hasValue: true,
  };
}

async function upsertComparisonValue(params: {
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  serviceId: string;
  planId: string | null;
  fieldId: string;
  parsed: ParsedValue;
}): Promise<string | null> {
  const { supabase, serviceId, planId, fieldId, parsed } = params;

  let existingQuery = supabase
    .from("comparison_values")
    .select("id")
    .eq("service_id", serviceId)
    .eq("comparison_field_id", fieldId);

  existingQuery = planId
    ? existingQuery.eq("plan_id", planId)
    : existingQuery.is("plan_id", null);

  const { data: existing } = await existingQuery.maybeSingle();

  if (!parsed.hasValue) {
    if (existing) {
      const { error } = await supabase
        .from("comparison_values")
        .delete()
        .eq("id", existing.id);
      if (error) return error.message;
    }
    return null;
  }

  const payload = {
    service_id: serviceId,
    plan_id: planId,
    comparison_field_id: fieldId,
    boolean_value: parsed.boolean_value,
    number_value: parsed.number_value,
    text_value: parsed.text_value,
  };

  if (existing) {
    const { error } = await supabase
      .from("comparison_values")
      .update(payload)
      .eq("id", existing.id);
    if (error) return error.message;
  } else {
    const { error } = await supabase.from("comparison_values").insert(payload);
    if (error) return error.message;
  }
  return null;
}

export async function saveServiceComparisonValuesAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) return { ok: false, message: "管理者権限が必要です。" };

  const serviceId = formString(formData, "service_id");
  const categoryId = formString(formData, "category_id");
  if (!serviceId || !categoryId) {
    return { ok: false, message: "サービス情報が不正です。" };
  }

  const { data: fields, error: fieldsError } = await supabase
    .from("comparison_fields")
    .select("*")
    .eq("category_id", categoryId)
    .eq("is_published", true)
    .order("display_order", { ascending: true });

  if (fieldsError) return { ok: false, message: fieldsError.message };

  const { data: plans, error: plansError } = await supabase
    .from("service_plans")
    .select("id")
    .eq("service_id", serviceId);

  if (plansError) return { ok: false, message: plansError.message };

  const planIds = (plans ?? []).map((p) => p.id);

  for (const field of fields ?? []) {
    const fieldId = field.id;
    const type = field.field_type as FieldType;

    // サービス単位
    const serviceKey = `svc_${fieldId}`;
    const serviceParsed = parseFieldValue(type, formData, serviceKey);
    if ("error" in serviceParsed) {
      return { ok: false, message: `「${field.name}」: ${serviceParsed.error}` };
    }
    const svcErr = await upsertComparisonValue({
      supabase,
      serviceId,
      planId: null,
      fieldId,
      parsed: serviceParsed,
    });
    if (svcErr) return { ok: false, message: svcErr };

    // プラン単位
    for (const planId of planIds) {
      const planKey = `plan_${planId}_${fieldId}`;
      // フォームにキーが無い場合はスキップ（未表示プラン）
      if (!formData.has(planKey)) continue;

      const planParsed = parseFieldValue(type, formData, planKey);
      if ("error" in planParsed) {
        return {
          ok: false,
          message: `「${field.name}」(プラン): ${planParsed.error}`,
        };
      }
      const planErr = await upsertComparisonValue({
        supabase,
        serviceId,
        planId,
        fieldId,
        parsed: planParsed,
      });
      if (planErr) return { ok: false, message: planErr };
    }
  }

  await revalidateServicePaths(serviceId);
  return { ok: true, message: "比較項目の値を保存しました。" };
}

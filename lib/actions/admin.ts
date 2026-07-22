"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { isReservedPathSegment } from "@/lib/links";
import { revalidatePublicSiteCache } from "@/lib/site/cache";
import {
  affiliateLinkSchema,
  categorySchema,
  serviceSchema,
} from "@/lib/validations";
import type { AffiliateLink } from "@/lib/types/database";

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

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = formString(formData, "email").trim();
  const password = formString(formData, "password");
  const next = formString(formData, "next") || "/admin";

  if (!email || !password) {
    return { ok: false, message: "メールアドレスとパスワードを入力してください。" };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: "ログインに失敗しました。認証情報を確認してください。" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "ログインに失敗しました。" };
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!admin) {
    await supabase.auth.signOut();
    return {
      ok: false,
      message: "管理者権限がありません。admin_users への登録を確認してください。",
    };
  }

  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function saveCategoryAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "管理者権限が必要です。" };
  }

  const id = formString(formData, "id") || null;
  const parsed = categorySchema.safeParse({
    name: formString(formData, "name"),
    slug: formString(formData, "slug"),
    description: formString(formData, "description"),
    icon: formString(formData, "icon"),
    display_order: formString(formData, "display_order") || "0",
    is_published: formBoolean(formData, "is_published"),
    seo_title: formString(formData, "seo_title"),
    seo_description: formString(formData, "seo_description"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "入力内容を確認してください。",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (isReservedPathSegment(parsed.data.slug)) {
    return {
      ok: false,
      message: `スラッグ「${parsed.data.slug}」は予約語のため使用できません。`,
    };
  }

  if (id) {
    const { error } = await supabase
      .from("categories")
      .update(parsed.data)
      .eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }
  } else {
    const { error } = await supabase.from("categories").insert(parsed.data);
    if (error) {
      return { ok: false, message: error.message };
    }
  }

  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePublicSiteCache();
  revalidatePath(`/${parsed.data.slug}`);
  return { ok: true, message: "カテゴリを保存しました。" };
}

export async function deleteCategoryAction(formData: FormData): Promise<ActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "管理者権限が必要です。" };
  }

  const id = formString(formData, "id");
  if (!id) {
    return { ok: false, message: "削除対象が不正です。" };
  }

  const { count } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message: "サービスが紐づいているカテゴリは削除できません。先にサービスを移動または削除してください。",
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePublicSiteCache();
  return { ok: true, message: "カテゴリを削除しました。" };
}

export async function saveServiceAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "管理者権限が必要です。" };
  }

  const id = formString(formData, "id") || null;
  const parsed = serviceSchema.safeParse({
    category_id: formString(formData, "category_id"),
    name: formString(formData, "name"),
    slug: formString(formData, "slug"),
    short_name: formString(formData, "short_name"),
    catchphrase: formString(formData, "catchphrase"),
    summary: formString(formData, "summary"),
    description: formString(formData, "description"),
    logo_url: formString(formData, "logo_url"),
    thumbnail_url: formString(formData, "thumbnail_url"),
    official_url: formString(formData, "official_url"),
    affiliate_url: formString(formData, "affiliate_url"),
    affiliate_network: formString(formData, "affiliate_network") || "A8",
    affiliate_status: formString(formData, "affiliate_status") || "inactive",
    recommended_uses: formString(formData, "recommended_uses"),
    editor_score: formString(formData, "editor_score"),
    display_order: formString(formData, "display_order") || "0",
    status: formString(formData, "status") || "draft",
    is_featured: formBoolean(formData, "is_featured"),
    seo_title: formString(formData, "seo_title"),
    seo_description: formString(formData, "seo_description"),
    canonical_url: formString(formData, "canonical_url"),
    og_image_url: formString(formData, "og_image_url"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "入力内容を確認してください。",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const affiliateParsed = affiliateLinkSchema.safeParse({
    asp_name: formString(formData, "asp_name"),
    program_name: formString(formData, "program_name"),
    official_url: formString(formData, "affiliate_official_url") || formString(formData, "official_url"),
    affiliate_url: formString(formData, "affiliate_url"),
    approval_status: formString(formData, "approval_status") || "not_applied",
    reward_note: formString(formData, "reward_note"),
    is_primary: true,
    is_active: formBoolean(formData, "affiliate_is_active"),
  });

  if (!affiliateParsed.success) {
    return {
      ok: false,
      message: "リンク・ASPの入力内容を確認してください。",
      fieldErrors: affiliateParsed.error.flatten().fieldErrors,
    };
  }

  const servicePayload = {
    ...parsed.data,
    primary_link_url: parsed.data.affiliate_url,
  };

  let serviceId = id;

  if (id) {
    const { error } = await supabase
      .from("services")
      .update(servicePayload)
      .eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }
  } else {
    const { data, error } = await supabase
      .from("services")
      .insert(servicePayload)
      .select("id")
      .single();
    if (error || !data) {
      return { ok: false, message: error?.message ?? "サービスの作成に失敗しました。" };
    }
    serviceId = data.id;
  }

  const affiliateId = formString(formData, "affiliate_id") || null;
  const affiliatePayload = {
    ...affiliateParsed.data,
    service_id: serviceId!,
  };

  if (affiliateId) {
    const { error } = await supabase
      .from("affiliate_links")
      .update(affiliatePayload)
      .eq("id", affiliateId)
      .eq("service_id", serviceId!);
    if (error) {
      return { ok: false, message: error.message };
    }
  } else {
    // 既存 primary があれば更新、なければ作成
    const { data: existing } = await supabase
      .from("affiliate_links")
      .select("id")
      .eq("service_id", serviceId!)
      .eq("is_primary", true)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("affiliate_links")
        .update(affiliatePayload)
        .eq("id", existing.id);
      if (error) {
        return { ok: false, message: error.message };
      }
    } else {
      const { error } = await supabase
        .from("affiliate_links")
        .insert(affiliatePayload);
      if (error) {
        return { ok: false, message: error.message };
      }
    }
  }

  const { data: category } = await supabase
    .from("categories")
    .select("slug")
    .eq("id", parsed.data.category_id)
    .maybeSingle();

  revalidatePath("/admin/services");
  revalidatePath("/");
  revalidatePublicSiteCache();
  if (category?.slug) {
    revalidatePath(`/${category.slug}`);
    revalidatePath(`/${category.slug}/services`);
    revalidatePath(`/${category.slug}/services/${parsed.data.slug}`);
  }

  if (!id && serviceId) {
    redirect(`/admin/services/${serviceId}?saved=1&tab=scrape`);
  }

  return { ok: true, message: "サービスを保存しました。" };
}

export async function deleteServiceAction(formData: FormData): Promise<ActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "管理者権限が必要です。" };
  }

  const id = formString(formData, "id");
  if (!id) {
    return { ok: false, message: "削除対象が不正です。" };
  }

  const { data: service } = await supabase
    .from("services")
    .select("slug, category_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) {
    return { ok: false, message: error.message };
  }

  let categorySlug: string | undefined;
  if (service?.category_id) {
    const { data: category } = await supabase
      .from("categories")
      .select("slug")
      .eq("id", service.category_id)
      .maybeSingle();
    categorySlug = category?.slug;
  }

  revalidatePath("/admin/services");
  revalidatePath("/");
  revalidatePublicSiteCache();
  if (categorySlug && service?.slug) {
    revalidatePath(`/${categorySlug}/services`);
    revalidatePath(`/${categorySlug}/services/${service.slug}`);
  }

  redirect("/admin/services");
}

export async function toggleServicePublishAction(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "管理者権限が必要です。" };
  }

  const id = formString(formData, "id");
  const nextStatus = formString(formData, "status") as
    | "published"
    | "unpublished"
    | "draft";

  if (!id || !["published", "unpublished", "draft"].includes(nextStatus)) {
    return { ok: false, message: "入力内容が不正です。" };
  }

  const { data: current } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!current) {
    return { ok: false, message: "サービスが見つかりません。" };
  }

  const hadTopPlacement =
    Boolean(
      (current as { show_in_top_featured_comparison?: boolean })
        .show_in_top_featured_comparison,
    ) ||
    Boolean(
      (current as { show_in_top_comparison?: boolean }).show_in_top_comparison,
    );

  const clearTopPlacement =
    nextStatus !== "published" && hadTopPlacement;

  let updateError = (
    await supabase
      .from("services")
      .update({
        status: nextStatus,
        ...(clearTopPlacement ||
        (nextStatus !== "published" &&
          "show_in_top_featured_comparison" in current)
          ? {
              show_in_top_featured_comparison: false,
              show_in_top_comparison: false,
              top_featured_display_order: null,
              top_comparison_display_order: null,
            }
          : {}),
      })
      .eq("id", id)
  ).error;

  // マイグレーション未適用時は掲載カラムなしで公開状態のみ更新
  if (updateError && nextStatus !== "published") {
    updateError = (
      await supabase
        .from("services")
        .update({ status: nextStatus })
        .eq("id", id)
    ).error;
  }

  if (updateError) {
    return { ok: false, message: "公開状態の更新に失敗しました。" };
  }

  const { data: category } = await supabase
    .from("categories")
    .select("slug")
    .eq("id", current.category_id)
    .maybeSingle();

  revalidatePath("/admin/services");
  revalidatePath("/");
  revalidatePublicSiteCache();
  if (category?.slug) {
    revalidatePath(`/${category.slug}`);
    revalidatePath(`/${category.slug}/compare`);
    revalidatePath(`/${category.slug}/services`);
    if (current.slug) {
      revalidatePath(`/${category.slug}/services/${current.slug}`);
    }
  }

  if (clearTopPlacement) {
    return {
      ok: true,
      message: "非公開に変更したため、TOP掲載設定も解除しました。",
    };
  }

  return {
    ok: true,
    message:
      nextStatus === "published" ? "公開しました。" : "非公開にしました。",
  };
}

export type TopPlacementItemInput = {
  id: string;
  show_in_top_featured_comparison: boolean;
  show_in_top_comparison: boolean;
  top_featured_display_order?: number | null;
  top_comparison_display_order?: number | null;
};

export async function saveTopPlacementAction(
  items: TopPlacementItemInput[],
): Promise<ActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "管理者権限が必要です。" };
  }

  if (!Array.isArray(items)) {
    return {
      ok: false,
      message: "保存に失敗しました。変更内容は反映されていません。",
    };
  }

  const ids = items.map((i) => i.id);
  if (new Set(ids).size !== ids.length) {
    return {
      ok: false,
      message: "同じサービスが重複しています。変更内容は反映されていません。",
    };
  }

  const featuredItems = items
    .filter((i) => i.show_in_top_featured_comparison)
    .sort((a, b) => {
      const oa = a.top_featured_display_order ?? Number.MAX_SAFE_INTEGER;
      const ob = b.top_featured_display_order ?? Number.MAX_SAFE_INTEGER;
      return oa - ob;
    });
  const comparisonItems = items
    .filter((i) => i.show_in_top_comparison)
    .sort((a, b) => {
      const oa = a.top_comparison_display_order ?? Number.MAX_SAFE_INTEGER;
      const ob = b.top_comparison_display_order ?? Number.MAX_SAFE_INTEGER;
      return oa - ob;
    });

  if (featuredItems.length > 3) {
    return {
      ok: false,
      message:
        "人気3社の比較には最大3件まで選択できます。先に別のサービスを解除してください。",
    };
  }
  if (comparisonItems.length > 10) {
    return {
      ok: false,
      message:
        "TOPの比較表には最大10件まで選択できます。先に別のサービスを解除してください。",
    };
  }

  if (ids.length === 0) {
    return { ok: true, message: "TOP掲載設定を更新しました" };
  }

  const { data: rows, error: loadError } = await supabase
    .from("services")
    .select("id, is_published, name")
    .in("id", ids);

  if (loadError || !rows) {
    return {
      ok: false,
      message: "保存に失敗しました。変更内容は反映されていません。",
    };
  }

  if (rows.length !== ids.length) {
    return {
      ok: false,
      message: "対象サービスが見つかりません。変更内容は反映されていません。",
    };
  }

  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const item of items) {
    const row = byId.get(item.id);
    if (!row) {
      return {
        ok: false,
        message: "対象サービスが見つかりません。変更内容は反映されていません。",
      };
    }
    if (
      (item.show_in_top_featured_comparison || item.show_in_top_comparison) &&
      !row.is_published
    ) {
      return {
        ok: false,
        message: `「${row.name}」は非公開のため選択できません。変更内容は反映されていません。`,
      };
    }
  }

  const featuredOrder = new Map(
    featuredItems.map((item, index) => [item.id, index + 1]),
  );
  const comparisonOrder = new Map(
    comparisonItems.map((item, index) => [item.id, index + 1]),
  );

  for (const item of items) {
    const { error } = await supabase
      .from("services")
      .update({
        show_in_top_featured_comparison: item.show_in_top_featured_comparison,
        show_in_top_comparison: item.show_in_top_comparison,
        top_featured_display_order: item.show_in_top_featured_comparison
          ? (featuredOrder.get(item.id) ?? null)
          : null,
        top_comparison_display_order: item.show_in_top_comparison
          ? (comparisonOrder.get(item.id) ?? null)
          : null,
      })
      .eq("id", item.id);

    if (error) {
      const missingColumn =
        /show_in_top_|top_featured_display_order|top_comparison_display_order/i.test(
          error.message,
        ) || error.code === "42703";
      return {
        ok: false,
        message: missingColumn
          ? "保存に失敗しました。マイグレーション 202607190003_top_placement.sql をSupabaseへ適用してください。"
          : "保存に失敗しました。変更内容は反映されていません。",
      };
    }
  }

  revalidatePath("/admin/services");
  revalidatePath("/");
  revalidatePublicSiteCache();
  revalidatePath("/server");
  revalidatePath("/server/compare");
  revalidatePath("/server/services");

  return { ok: true, message: "TOP掲載設定を更新しました" };
}

export async function duplicateServiceAction(formData: FormData) {
  const { supabase, admin } = await requireAdmin();
  if (!admin) {
    return;
  }

  const id = formString(formData, "id");
  if (!id) {
    return;
  }

  const { data: source, error } = await supabase
    .from("services")
    .select("*, affiliate_links(*)")
    .eq("id", id)
    .maybeSingle();

  if (error || !source) {
    return;
  }

  const baseSlug = `${source.slug}-copy`;
  let slug = baseSlug;
  for (let i = 2; i < 50; i += 1) {
    const { data: exists } = await supabase
      .from("services")
      .select("id")
      .eq("category_id", source.category_id)
      .eq("slug", slug)
      .maybeSingle();
    if (!exists) break;
    slug = `${baseSlug}-${i}`;
  }

  const sourceRecord = source as typeof source & {
    affiliate_links?: AffiliateLink[];
  };
  const links = sourceRecord.affiliate_links ?? [];

  const { data: created, error: insertError } = await supabase
    .from("services")
    .insert({
      category_id: source.category_id,
      name: `${source.name}（コピー）`,
      slug,
      short_name: source.short_name,
      catchphrase: source.catchphrase,
      summary: source.summary,
      description: source.description,
      logo_url: source.logo_url,
      thumbnail_url: source.thumbnail_url,
      official_url: source.official_url,
      primary_link_url: source.primary_link_url,
      status: "draft",
      is_published: false,
      is_featured: false,
      display_order: source.display_order,
      editor_score: source.editor_score,
      recommended_uses: source.recommended_uses,
      seo_title: source.seo_title,
      seo_description: source.seo_description,
      canonical_url: source.canonical_url,
      og_image_url: source.og_image_url,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return;
  }

  const primary = links.find((l) => l.is_primary) ?? links[0] ?? null;

  if (primary) {
    await supabase.from("affiliate_links").insert({
      service_id: created.id,
      asp_name: primary.asp_name,
      program_name: primary.program_name,
      official_url: primary.official_url,
      affiliate_url: primary.affiliate_url,
      approval_status: primary.approval_status,
      reward_note: primary.reward_note,
      is_primary: true,
      is_active: primary.is_active,
    });
  }

  revalidatePath("/admin/services");
  redirect(`/admin/services/${created.id}`);
}

/** Phase2: 残り18社のサービス器を一括登録（プラン・比較値は作らない） */
export async function seedPhase2ShellServicesAction(): Promise<ActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "管理者権限が必要です。" };
  }

  const { PHASE2_SHELL_SERVICES, PHASE2_SHELL_SERVICES_TO_INSERT } =
    await import("@/lib/services/phase2-shell-services");

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, slug")
    .eq("slug", "server")
    .maybeSingle();

  if (categoryError || !category) {
    return { ok: false, message: "カテゴリ「server」が見つかりません。" };
  }

  // 既存2社の表示順を整える
  for (const shell of PHASE2_SHELL_SERVICES.filter(
    (s) => s.slug === "xserver" || s.slug === "conoha-wing",
  )) {
    await supabase
      .from("services")
      .update({ display_order: shell.displayOrder })
      .eq("category_id", category.id)
      .eq("slug", shell.slug);
  }

  const { data: existing } = await supabase
    .from("services")
    .select("slug")
    .eq("category_id", category.id);

  const existingSlugs = new Set((existing ?? []).map((row) => row.slug));
  const toInsert = PHASE2_SHELL_SERVICES_TO_INSERT.filter(
    (s) => !existingSlugs.has(s.slug),
  );

  if (toInsert.length === 0) {
    revalidatePath("/admin/services");
    revalidatePath("/server/services");
    revalidatePublicSiteCache();
    return {
      ok: true,
      message: "追加対象はありません（18社は既に登録済みです）。",
    };
  }

  const rows = toInsert.map((s) => ({
    category_id: category.id,
    name: s.name,
    slug: s.slug,
    summary: s.summary,
    description: s.summary,
    official_url: s.officialUrl,
    status: "published" as const,
    display_order: s.displayOrder,
    seo_title: `${s.name}｜サーバー図鑑`,
    seo_description: s.summary,
  }));

  const { error } = await supabase.from("services").insert(rows);
  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/services");
  revalidatePath("/");
  revalidatePublicSiteCache();
  revalidatePath("/server");
  revalidatePath("/server/services");
  for (const s of toInsert) {
    revalidatePath(`/server/services/${s.slug}`);
  }

  return {
    ok: true,
    message: `${toInsert.length}件のサービスを登録しました。`,
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { DOMAIN_COMPARISON_ITEM_DEFS } from "@/lib/admin/domain-comparison-items";
import type { ActionResult } from "@/lib/actions/admin";
import type { DomainComparisonItem } from "@/lib/types/database";
import { revalidatePublicSiteCache } from "@/lib/site/cache";

export type DomainComparisonItemSaveRow = {
  id: string;
  display_name: string;
  is_visible: boolean;
  sort_order: number;
  highlight_best: boolean;
};

/** 不足している初期項目を冪等に補完して返す */
export async function ensureDomainComparisonItems(
  dictionaryId: string,
): Promise<{
  items: DomainComparisonItem[];
  errorMessage: string | null;
}> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) {
    return { items: [], errorMessage: "管理者権限が必要です。" };
  }

  const { data: existing, error } = await supabase
    .from("domain_comparison_items")
    .select("*")
    .eq("dictionary_id", dictionaryId)
    .order("sort_order", { ascending: true });

  if (error) {
    const missing =
      error.code === "42P01" ||
      /does not exist|schema cache|Could not find the table/i.test(error.message);
    return {
      items: [],
      errorMessage: missing
        ? "テーブル未作成: migration 202607230006_domain_comparison_items.sql を適用してください。"
        : error.message,
    };
  }

  const byKey = new Set((existing ?? []).map((r) => r.item_key));
  const missingRows = DOMAIN_COMPARISON_ITEM_DEFS.filter(
    (d) => !byKey.has(d.item_key),
  ).map((d) => ({
    dictionary_id: dictionaryId,
    group_key: d.group_key,
    item_key: d.item_key,
    display_name: d.display_name,
    is_visible: d.is_visible,
    sort_order: d.sort_order,
    highlight_best: d.group_key === "price" ? d.highlight_best : false,
  }));

  if (missingRows.length > 0) {
    const { error: insertError } = await supabase
      .from("domain_comparison_items")
      .insert(missingRows);
    if (insertError) {
      return { items: existing ?? [], errorMessage: insertError.message };
    }
  }

  const { data: all, error: reloadError } = await supabase
    .from("domain_comparison_items")
    .select("*")
    .eq("dictionary_id", dictionaryId)
    .order("group_key", { ascending: true })
    .order("sort_order", { ascending: true });

  if (reloadError) {
    return { items: existing ?? [], errorMessage: reloadError.message };
  }

  return { items: (all as DomainComparisonItem[]) ?? [], errorMessage: null };
}

export async function saveDomainComparisonItemsAction(
  dictionaryId: string,
  rows: DomainComparisonItemSaveRow[],
): Promise<ActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "管理者権限が必要です。" };
  }

  if (!dictionaryId) {
    return { ok: false, message: "図鑑IDが必要です。" };
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, message: "保存データが空です。" };
  }

  const { data: dictionary } = await supabase
    .from("dictionaries")
    .select("id, slug")
    .eq("id", dictionaryId)
    .eq("slug", "domain")
    .maybeSingle();

  if (!dictionary) {
    return { ok: false, message: "図鑑「domain」が見つかりません。" };
  }

  const ids = rows.map((r) => r.id);
  const { data: owned, error: ownedError } = await supabase
    .from("domain_comparison_items")
    .select("id, group_key")
    .eq("dictionary_id", dictionary.id)
    .in("id", ids);

  if (ownedError) {
    return { ok: false, message: ownedError.message };
  }

  const ownedMap = new Map((owned ?? []).map((r) => [r.id, r.group_key]));
  if (ownedMap.size !== ids.length) {
    return {
      ok: false,
      message: "ドメイン図鑑以外の項目が含まれています。",
    };
  }

  for (const row of rows) {
    const displayName = row.display_name.trim();
    if (!displayName) {
      return { ok: false, message: "表示名は必須です。" };
    }
    const groupKey = ownedMap.get(row.id);
    const { error } = await supabase
      .from("domain_comparison_items")
      .update({
        display_name: displayName,
        is_visible: Boolean(row.is_visible),
        sort_order: Number.isFinite(row.sort_order) ? row.sort_order : 0,
        highlight_best:
          groupKey === "price" ? Boolean(row.highlight_best) : false,
      })
      .eq("id", row.id)
      .eq("dictionary_id", dictionary.id);

    if (error) {
      return { ok: false, message: error.message };
    }
  }

  revalidatePath("/admin/domain/comparison-items");
  revalidatePath("/domain");
  revalidatePublicSiteCache();
  return { ok: true, message: "保存しました。公開TOP比較表へ反映されます。" };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublicSiteCache } from "@/lib/site/cache";
import { validateComparisonDisplayPlacement } from "@/lib/site/comparison-display";
import type { CompareRule } from "@/lib/types/database";

export type ComparisonDisplayActionResult = {
  ok: boolean;
  message: string;
};

type PlacementRow = {
  id: string;
  show_in_top_featured: boolean;
  top_featured_display_order: number | null;
  show_in_top_table: boolean;
  top_table_display_order: number | null;
  show_in_compare_page: boolean;
  compare_page_display_order: number | null;
  compare_rule: CompareRule | null;
};

export async function saveComparisonDisplayAction(
  formData: FormData,
): Promise<ComparisonDisplayActionResult> {
  const { supabase, admin } = await requireAdmin();
  if (!admin) {
    return { ok: false, message: "管理者権限が必要です。" };
  }

  const categoryId = String(formData.get("category_id") ?? "").trim();
  if (!categoryId) {
    return { ok: false, message: "カテゴリを選択してください。" };
  }

  let rows: PlacementRow[] = [];
  try {
    const raw = String(formData.get("placements_json") ?? "[]");
    rows = JSON.parse(raw) as PlacementRow[];
  } catch {
    return { ok: false, message: "表示設定の形式が不正です。" };
  }

  const featuredIds = rows
    .filter((r) => r.show_in_top_featured)
    .sort(
      (a, b) =>
        (a.top_featured_display_order ?? 0) -
        (b.top_featured_display_order ?? 0),
    )
    .map((r) => r.id);
  const tableIds = rows
    .filter((r) => r.show_in_top_table)
    .sort(
      (a, b) =>
        (a.top_table_display_order ?? 0) - (b.top_table_display_order ?? 0),
    )
    .map((r) => r.id);
  const compareIds = rows
    .filter((r) => r.show_in_compare_page)
    .map((r) => r.id);

  const validation = validateComparisonDisplayPlacement({
    featuredIds,
    tableIds,
    compareIds,
  });
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  for (const row of rows) {
    const { error } = await supabase
      .from("comparison_fields")
      .update({
        show_in_top_featured: row.show_in_top_featured,
        top_featured_display_order: row.show_in_top_featured
          ? row.top_featured_display_order
          : null,
        show_in_top_table: row.show_in_top_table,
        top_table_display_order: row.show_in_top_table
          ? row.top_table_display_order
          : null,
        show_in_compare_page: row.show_in_compare_page,
        compare_page_display_order: row.show_in_compare_page
          ? row.compare_page_display_order
          : null,
        compare_rule: row.compare_rule,
      })
      .eq("id", row.id)
      .eq("category_id", categoryId);

    if (error) {
      return { ok: false, message: error.message };
    }
  }

  revalidatePath("/admin/comparison-fields");
  revalidatePublicSiteCache();
  return { ok: true, message: "比較項目の表示設定を保存しました。" };
}

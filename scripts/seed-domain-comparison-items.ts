/**
 * domain_comparison_items の初期データを冪等登録する。
 * テーブル未作成の場合は migration 202607230006 を先に適用すること。
 *
 *   npx tsx scripts/seed-domain-comparison-items.ts
 */
import { createClient } from "@supabase/supabase-js";
import { DOMAIN_COMPARISON_ITEM_DEFS } from "../lib/admin/domain-comparison-items";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要です");
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: dictionary, error: dictError } = await supabase
    .from("dictionaries")
    .select("id")
    .eq("slug", "domain")
    .maybeSingle();

  if (dictError || !dictionary) {
    throw new Error("図鑑 domain が見つかりません");
  }

  const { data: existing, error } = await supabase
    .from("domain_comparison_items")
    .select("item_key")
    .eq("dictionary_id", dictionary.id);

  if (error) {
    throw new Error(
      /schema cache|Could not find the table|does not exist/i.test(error.message)
        ? "テーブル未作成: 先に 202607230006_domain_comparison_items.sql を適用してください"
        : error.message,
    );
  }

  const have = new Set((existing ?? []).map((r) => r.item_key));
  const toInsert = DOMAIN_COMPARISON_ITEM_DEFS.filter((d) => !have.has(d.item_key)).map(
    (d) => ({
      dictionary_id: dictionary.id,
      group_key: d.group_key,
      item_key: d.item_key,
      display_name: d.display_name,
      is_visible: d.is_visible,
      sort_order: d.sort_order,
      highlight_best: d.highlight_best,
    }),
  );

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("domain_comparison_items")
      .insert(toInsert);
    if (insertError) throw new Error(insertError.message);
  }

  const { data: all } = await supabase
    .from("domain_comparison_items")
    .select("group_key,item_key,display_name,is_visible,sort_order,highlight_best")
    .eq("dictionary_id", dictionary.id)
    .order("group_key")
    .order("sort_order");

  console.log(
    JSON.stringify({ inserted: toInsert.length, items: all }, null, 2),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

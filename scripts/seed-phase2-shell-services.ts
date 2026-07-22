/**
 * Phase2 残り18社を DB へ一括登録するスクリプト。
 * 管理者アカウントでサインインして services に insert する（anon + RLS）。
 *
 * 使い方:
 *   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npx tsx scripts/seed-phase2-shell-services.ts
 */
import { createClient } from "@supabase/supabase-js";
import {
  PHASE2_SHELL_SERVICES,
  PHASE2_SHELL_SERVICES_TO_INSERT,
} from "../lib/services/phase2-shell-services";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!url || !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY が未設定です",
    );
  }
  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD を環境変数で指定してください",
    );
  }

  const supabase = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authError) {
    throw new Error(`ログイン失敗: ${authError.message}`);
  }

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "server")
    .maybeSingle();

  if (categoryError || !category) {
    throw new Error("カテゴリ server が見つかりません");
  }

  for (const shell of PHASE2_SHELL_SERVICES.filter(
    (s) => s.slug === "xserver" || s.slug === "conoha-wing",
  )) {
    const { error } = await supabase
      .from("services")
      .update({ display_order: shell.displayOrder })
      .eq("category_id", category.id)
      .eq("slug", shell.slug);
    if (error) {
      console.warn(`display_order update skipped (${shell.slug}): ${error.message}`);
    }
  }

  const { data: existing, error: existingError } = await supabase
    .from("services")
    .select("slug")
    .eq("category_id", category.id);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingSlugs = new Set((existing ?? []).map((r) => r.slug));
  const toInsert = PHASE2_SHELL_SERVICES_TO_INSERT.filter(
    (s) => !existingSlugs.has(s.slug),
  );

  if (toInsert.length === 0) {
    console.log("追加対象なし（18社は既に登録済み）");
    const { data: all } = await supabase
      .from("services")
      .select("display_order,name,slug,status")
      .eq("category_id", category.id)
      .order("display_order", { ascending: true });
    console.log(JSON.stringify(all, null, 2));
    return;
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

  const { error: insertError } = await supabase.from("services").insert(rows);
  if (insertError) {
    throw new Error(insertError.message);
  }

  console.log(`inserted: ${toInsert.length}`);
  const { data: all } = await supabase
    .from("services")
    .select("display_order,name,slug,status,is_published")
    .eq("category_id", category.id)
    .order("display_order", { ascending: true });
  console.log(JSON.stringify(all, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

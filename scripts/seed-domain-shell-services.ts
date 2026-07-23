/**
 * ドメイン図鑑の初期サービス8件を冪等登録する。
 *
 * 使い方:
 *   npx tsx scripts/seed-domain-shell-services.ts
 *
 * SUPABASE_SERVICE_ROLE_KEY があればそれを使用。なければ
 * SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD で管理者ログイン。
 */
import { createClient } from "@supabase/supabase-js";
import { DOMAIN_SHELL_SERVICES } from "../lib/services/domain-shell-services";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL が未設定です");
  }

  const supabase = serviceRoleKey
    ? createClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : (() => {
        if (!publishableKey) {
          throw new Error(
            "SUPABASE_SERVICE_ROLE_KEY または NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY が必要です",
          );
        }
        return createClient(url, publishableKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      })();

  if (!serviceRoleKey) {
    if (!email || !password) {
      throw new Error(
        "SERVICE_ROLE がない場合は SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD を指定してください",
      );
    }
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      throw new Error(`ログイン失敗: ${authError.message}`);
    }
  }

  let { data: dictionary, error: dictionaryError } = await supabase
    .from("dictionaries")
    .select("id")
    .eq("slug", "domain")
    .maybeSingle();

  if (dictionaryError) {
    throw new Error(dictionaryError.message);
  }

  if (!dictionary) {
    const { data: createdDict, error: createDictError } = await supabase
      .from("dictionaries")
      .insert({
        name: "ドメイン図鑑",
        slug: "domain",
        description:
          "ドメイン取得・管理サービスを比較できる図鑑です（準備中）。",
        is_public: false,
        sort_order: 2,
        color: "#0f766e",
      })
      .select("id")
      .single();
    if (createDictError || !createdDict) {
      throw new Error(
        `図鑑 domain の作成に失敗: ${createDictError?.message ?? "unknown"}`,
      );
    }
    dictionary = createdDict;
    console.log("created dictionary: domain");
  }

  let { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "domain")
    .maybeSingle();

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  if (!category) {
    const { data: createdCategory, error: createCategoryError } = await supabase
      .from("categories")
      .insert({
        name: "ドメイン",
        slug: "domain",
        description: "ドメイン取得・管理サービス",
        display_order: 2,
        is_published: false,
        seo_title: "ドメイン比較｜Webサービス図鑑",
        seo_description: "ドメイン取得サービスを料金・機能で比較できます。",
      })
      .select("id")
      .single();
    if (createCategoryError || !createdCategory) {
      throw new Error(
        `カテゴリ domain の作成に失敗: ${createCategoryError?.message ?? "unknown"}`,
      );
    }
    category = createdCategory;
    console.log("created category: domain");
  }

  const { data: existing, error: existingError } = await supabase
    .from("services")
    .select("id, slug, name, official_url, display_order")
    .eq("dictionary_id", dictionary.id);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const bySlug = new Map((existing ?? []).map((row) => [row.slug, row]));
  let inserted = 0;
  let updated = 0;
  let warnedMissingDetails = false;

  const warnMissingDetails = (slug?: string) => {
    if (warnedMissingDetails) return;
    warnedMissingDetails = true;
    console.warn(
      `warn: domain_service_details 未作成のため詳細行をスキップ${
        slug ? ` (例: ${slug})` : ""
      }. 先に migration 202607230004 を適用してください。`,
    );
  };

  for (const shell of DOMAIN_SHELL_SERVICES) {
    const current = bySlug.get(shell.slug);
    if (!current) {
      const { data: created, error: insertError } = await supabase
        .from("services")
        .insert({
          dictionary_id: dictionary.id,
          category_id: category.id,
          name: shell.name,
          slug: shell.slug,
          official_url: shell.officialUrl,
          affiliate_url: null,
          affiliate_network: null,
          primary_link_url: null,
          status: "draft",
          is_published: false,
          is_site_visible: false,
          display_order: shell.displayOrder,
        })
        .select("id")
        .single();

      if (insertError || !created) {
        throw new Error(
          `insert failed (${shell.slug}): ${insertError?.message ?? "unknown"}`,
        );
      }

      const { error: detailsError } = await supabase
        .from("domain_service_details")
        .insert({ service_id: created.id });
      if (detailsError) {
        if (/domain_service_details|schema cache|Could not find the table/i.test(detailsError.message)) {
          warnMissingDetails(shell.slug);
        } else {
          throw new Error(
            `details insert failed (${shell.slug}): ${detailsError.message}`,
          );
        }
      }
      inserted += 1;
      continue;
    }

    const patch: {
      name?: string;
      official_url?: string;
      display_order?: number;
    } = {};
    if (!current.name?.trim()) patch.name = shell.name;
    if (!current.official_url?.trim()) patch.official_url = shell.officialUrl;
    if (current.display_order == null || current.display_order === 0) {
      patch.display_order = shell.displayOrder;
    }

    if (Object.keys(patch).length > 0) {
      const { error: updateError } = await supabase
        .from("services")
        .update(patch)
        .eq("id", current.id);
      if (updateError) {
        throw new Error(`update failed (${shell.slug}): ${updateError.message}`);
      }
      updated += 1;
    }

    const { data: details, error: detailsSelectError } = await supabase
      .from("domain_service_details")
      .select("id")
      .eq("service_id", current.id)
      .maybeSingle();
    if (
      detailsSelectError &&
      /domain_service_details|schema cache|Could not find the table/i.test(
        detailsSelectError.message,
      )
    ) {
      warnMissingDetails(shell.slug);
      continue;
    }
    if (!details) {
      const { error: detailsError } = await supabase
        .from("domain_service_details")
        .insert({ service_id: current.id });
      if (detailsError) {
        if (/domain_service_details|schema cache|Could not find the table/i.test(detailsError.message)) {
          warnMissingDetails(shell.slug);
        } else {
          throw new Error(
            `details insert failed (${shell.slug}): ${detailsError.message}`,
          );
        }
      }
    }
  }

  const { data: all, error: listError } = await supabase
    .from("services")
    .select(
      "display_order,name,slug,status,is_site_visible,official_url,affiliate_url,affiliate_network",
    )
    .eq("dictionary_id", dictionary.id)
    .in(
      "slug",
      DOMAIN_SHELL_SERVICES.map((s) => s.slug),
    )
    .order("display_order", { ascending: true });

  if (listError) {
    throw new Error(listError.message);
  }

  console.log(
    JSON.stringify(
      {
        inserted,
        updated,
        services: all,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

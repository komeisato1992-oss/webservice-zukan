/**
 * ドメイン図鑑「初めての方へ」4記事を managed_contents に upsert する。
 *
 * 使い方:
 *   npx tsx scripts/seed-domain-beginner-articles.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DOMAIN_BEGINNER_ARTICLES } from "../lib/domain-articles/registry";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const i = line.indexOf("=");
      const key = line.slice(0, i);
      const value = line.slice(i + 1).replace(/^"|"$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要です");
  }

  const sb = createClient(url, key);
  const now = new Date().toISOString();

  for (let i = 0; i < DOMAIN_BEGINNER_ARTICLES.length; i += 1) {
    const article = DOMAIN_BEGINNER_ARTICLES[i];
    const { data: existing } = await sb
      .from("managed_contents")
      .select("id")
      .eq("source_type", article.sourceType)
      .is("deleted_at", null)
      .maybeSingle();

    const payload = {
      content_type: "feature" as const,
      title: article.title,
      summary: article.description,
      body: article.defaultHtml,
      source_type: article.sourceType,
      source_url: null,
      status: "published" as const,
      is_checked: true,
      priority: i + 1,
      published_at: now,
      expires_at: null,
      ai_generated: false,
      deleted_at: null,
    };

    if (existing?.id) {
      const { error } = await sb
        .from("managed_contents")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw new Error(`${article.slug}: ${error.message}`);
      console.log("updated", article.slug, existing.id);
    } else {
      const { data, error } = await sb
        .from("managed_contents")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(`${article.slug}: ${error.message}`);
      console.log("inserted", article.slug, data.id);
    }
  }

  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

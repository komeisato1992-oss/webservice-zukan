import { cache } from "react";
import type { Dictionary } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/server";

export const DEFAULT_DICTIONARY_SLUG = "server";

/** DB未到達時やスキーマキャッシュ遅延時のフォールバック（Phase1固定） */
const KNOWN_DICTIONARIES: Omit<
  Dictionary,
  "id" | "created_at" | "updated_at"
>[] = [
  {
    name: "サーバー図鑑",
    slug: "server",
    color: "#2563eb",
    icon: null,
    description:
      "レンタルサーバー・ホスティングサービスを比較できる図鑑です。",
    is_public: true,
    sort_order: 1,
  },
  {
    name: "ドメイン図鑑",
    slug: "domain",
    color: "#0f766e",
    icon: null,
    description: "ドメイン取得・管理サービスを比較できる図鑑です（準備中）。",
    is_public: false,
    sort_order: 2,
  },
];

function fallbackDictionary(slug: string): Dictionary | null {
  const known = KNOWN_DICTIONARIES.find((d) => d.slug === slug);
  if (!known) return null;
  return {
    id: `fallback-${known.slug}`,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    ...known,
  };
}

function fallbackDictionaries(): Dictionary[] {
  return KNOWN_DICTIONARIES.map((d) => ({
    id: `fallback-${d.slug}`,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    ...d,
  }));
}

export function adminDictionaryPath(
  dictionarySlug: string,
  path = "",
): string {
  const normalized = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `/admin/${dictionarySlug}${normalized}`;
}

export function isKnownDictionarySlug(slug: string): boolean {
  return KNOWN_DICTIONARIES.some((d) => d.slug === slug);
}

/** DB未取得時のフォールバック行か（サービス絞り込みには使えない） */
export function isFallbackDictionary(dictionary: Dictionary): boolean {
  return dictionary.id.startsWith("fallback-");
}

export const listDictionaries = cache(async (): Promise<Dictionary[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("dictionaries")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[dictionaries] list failed:", error.message);
      return fallbackDictionaries();
    }
    if (!data?.length) return fallbackDictionaries();
    return data;
  } catch (error) {
    console.error("[dictionaries] list threw:", error);
    return fallbackDictionaries();
  }
});

export const getDictionaryBySlug = cache(
  async (slug: string): Promise<Dictionary | null> => {
    const normalized = typeof slug === "string" ? slug.trim() : "";
    if (!normalized) return null;

    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("dictionaries")
        .select("*")
        .eq("slug", normalized)
        .maybeSingle();

      if (error) {
        console.error("[dictionaries] getBySlug failed:", error.message);
        return fallbackDictionary(normalized);
      }
      return data ?? fallbackDictionary(normalized);
    } catch (error) {
      console.error("[dictionaries] getBySlug threw:", error);
      return fallbackDictionary(normalized);
    }
  },
);

/** 図鑑ごとのサービス数（管理画面一覧用） */
export async function countServicesByDictionary(): Promise<
  Record<string, number>
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .select("dictionary_id");

    if (error) {
      console.error("[dictionaries] count services failed:", error.message);
      return {};
    }

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const id = row.dictionary_id;
      if (!id) continue;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  } catch (error) {
    console.error("[dictionaries] count threw:", error);
    return {};
  }
}

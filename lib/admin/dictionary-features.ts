import { notFound } from "next/navigation";
import { getDictionaryBySlug } from "@/lib/admin/dictionaries";
import type { Dictionary } from "@/lib/types/database";

/** サーバー図鑑以外は Phase1 では機能未実装 */
export function isDictionaryFeatureReady(slug: string): boolean {
  return slug === "server";
}

export async function requireDictionary(
  dictionarySlug: string,
): Promise<Dictionary> {
  const dictionary = await getDictionaryBySlug(dictionarySlug);
  if (!dictionary) notFound();
  return dictionary;
}

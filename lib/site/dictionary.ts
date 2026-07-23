import { createPublicClient } from "@/lib/supabase/public";
import { cache } from "react";

/** 公開/管理共通: slug から dictionary id を解決（リクエスト内 dedupe） */
export const resolveDictionaryIdBySlug = cache(
  async (slug: string): Promise<string | null> => {
    try {
      const supabase = createPublicClient();
      const { data } = await supabase
        .from("dictionaries")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      return data?.id ?? null;
    } catch {
      return null;
    }
  },
);

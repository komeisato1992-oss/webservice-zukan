import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Cookie を読まない公開向けクライアント。
 * RLS の「公開データのみ」ポリシー前提。ページを dynamic にせずキャッシュ可能にする。
 */
export function createPublicClient() {
  const { url, publishableKey } = getSupabasePublicEnv();
  return createSupabaseClient<Database>(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

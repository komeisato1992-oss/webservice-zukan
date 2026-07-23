import { redirect } from "next/navigation";
import {
  DEFAULT_DICTIONARY_SLUG,
  adminDictionaryPath,
} from "@/lib/admin/dictionaries";

export const dynamic = "force-dynamic";

/** CMS入口はサーバー図鑑のサービス一覧へ統一 */
export default function AdminDashboardPage() {
  redirect(adminDictionaryPath(DEFAULT_DICTIONARY_SLUG, "/services"));
}

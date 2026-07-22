import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** CMS入口はサービス一覧へ統一 */
export default function AdminDashboardPage() {
  redirect("/admin/services");
}

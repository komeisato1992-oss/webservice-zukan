import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ContentForm } from "@/components/admin/content-form";

export const dynamic = "force-dynamic";

export default async function NewContentPage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/admin/contents"
          className="text-sm text-blue-700 hover:underline"
        >
          ← コンテンツ管理
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          コンテンツ新規作成
        </h1>
      </div>
      <ContentForm services={services ?? []} />
    </div>
  );
}

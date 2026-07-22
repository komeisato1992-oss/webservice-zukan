import { ServiceForm } from "@/components/admin/service-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("display_order", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">サービス追加</h1>
        <p className="mt-1 text-sm text-slate-600">
          候補から選ぶと公式URL・slug・概要が自動入力されます。保存後、公式情報取得へ進めます。
        </p>
      </div>
      <ServiceForm categories={categories ?? []} />
    </div>
  );
}

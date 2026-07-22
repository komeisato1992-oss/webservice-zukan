import { ComparisonFieldForm } from "@/components/admin/comparison-field-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewComparisonFieldPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("display_order", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">比較項目追加</h1>
        <p className="mt-1 text-sm text-slate-600">
          カテゴリに紐づく比較項目を追加します。例: 無料SSL（boolean /
          セキュリティ）、ストレージ種別（select / 容量・性能）
        </p>
      </div>
      <ComparisonFieldForm categories={categories ?? []} />
    </div>
  );
}

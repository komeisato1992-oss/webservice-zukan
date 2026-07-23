import { ComparisonFieldForm } from "@/components/admin/comparison-field-form";
import { createClient } from "@/lib/supabase/server";
import { DictionaryComingSoon } from "@/components/admin/dictionary-coming-soon";
import {
  isDictionaryFeatureReady,
  requireDictionary,
} from "@/lib/admin/dictionary-features";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ dictionarySlug: string }>;
};

export default async function NewComparisonFieldPage({ params }: Props) {
  const { dictionarySlug } = await params;
  const dictionary = await requireDictionary(dictionarySlug);
  if (!isDictionaryFeatureReady(dictionary.slug)) {
    return <DictionaryComingSoon dictionaryName={dictionary.name} />;
  }

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

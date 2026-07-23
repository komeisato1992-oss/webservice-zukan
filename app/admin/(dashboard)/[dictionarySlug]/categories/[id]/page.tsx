import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/category-form";
import { createClient } from "@/lib/supabase/server";
import { DictionaryComingSoon } from "@/components/admin/dictionary-coming-soon";
import {
  isDictionaryFeatureReady,
  requireDictionary,
} from "@/lib/admin/dictionary-features";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ dictionarySlug: string, id: string }> };

export default async function EditCategoryPage({ params }: Props) {
  const { dictionarySlug } = await params;
  const dictionary = await requireDictionary(dictionarySlug);
  if (!isDictionaryFeatureReady(dictionary.slug)) {
    return <DictionaryComingSoon dictionaryName={dictionary.name} />;
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!category) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">カテゴリ編集</h1>
        <p className="mt-1 text-sm text-slate-600">{category.name}</p>
      </div>
      <CategoryForm category={category} />
    </div>
  );
}

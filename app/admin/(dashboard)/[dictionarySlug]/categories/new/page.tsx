import { CategoryForm } from "@/components/admin/category-form";
import { DictionaryComingSoon } from "@/components/admin/dictionary-coming-soon";
import {
  isDictionaryFeatureReady,
  requireDictionary,
} from "@/lib/admin/dictionary-features";

type Props = {
  params: Promise<{ dictionarySlug: string }>;
};

export default async function NewCategoryPage({ params }: Props) {
  const { dictionarySlug } = await params;
  const dictionary = await requireDictionary(dictionarySlug);
  if (!isDictionaryFeatureReady(dictionary.slug)) {
    return <DictionaryComingSoon dictionaryName={dictionary.name} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">カテゴリ追加</h1>
        <p className="mt-1 text-sm text-slate-600">
          追加後、`/[slug]/services` で一覧・詳細が利用できます
        </p>
      </div>
      <CategoryForm />
    </div>
  );
}

import { notFound } from "next/navigation";
import { ComparisonFieldForm } from "@/components/admin/comparison-field-form";
import { createClient } from "@/lib/supabase/server";
import { DictionaryComingSoon } from "@/components/admin/dictionary-coming-soon";
import {
  isDictionaryFeatureReady,
  requireDictionary,
} from "@/lib/admin/dictionary-features";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ dictionarySlug: string, id: string }> };

export default async function EditComparisonFieldPage({ params }: Props) {
  const { dictionarySlug } = await params;
  const dictionary = await requireDictionary(dictionarySlug);
  if (!isDictionaryFeatureReady(dictionary.slug)) {
    return <DictionaryComingSoon dictionaryName={dictionary.name} />;
  }

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: categories }, { data: field }] = await Promise.all([
    supabase.from("categories").select("*").order("display_order", { ascending: true }),
    supabase.from("comparison_fields").select("*").eq("id", id).maybeSingle(),
  ]);

  if (!field) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">比較項目編集</h1>
        <p className="mt-1 text-sm text-slate-600">{field.name}</p>
      </div>
      <ComparisonFieldForm categories={categories ?? []} field={field} />
    </div>
  );
}

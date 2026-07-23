import { ServiceForm } from "@/components/admin/service-form";
import { DomainServiceCreateForm } from "@/components/admin/domain/domain-service-create-form";
import {
  getDictionaryBySlug,
  isFallbackDictionary,
} from "@/lib/admin/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ dictionarySlug: string }>;
};

export default async function NewServicePage({ params }: Props) {
  const { dictionarySlug } = await params;
  const dictionary = await getDictionaryBySlug(dictionarySlug);
  if (!dictionary) notFound();
  if (isFallbackDictionary(dictionary)) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center text-sm text-amber-950">
        図鑑マスタを読み込めないため、サービスを追加できません。ページを再読み込みしてください。
      </div>
    );
  }

  if (dictionary.slug === "domain") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">サービス追加</h1>
          <p className="mt-1 text-sm text-slate-600">
            ドメイン図鑑に登録します。最低限の項目で作成し、詳細は編集画面で入力できます。
          </p>
        </div>
        <DomainServiceCreateForm />
      </div>
    );
  }

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
          {dictionary.name}
          に登録します。候補から選ぶと公式URL・slug・概要が自動入力されます。
        </p>
      </div>
      <ServiceForm
        categories={categories ?? []}
        dictionaryId={dictionary.id}
        dictionarySlug={dictionary.slug}
      />
    </div>
  );
}

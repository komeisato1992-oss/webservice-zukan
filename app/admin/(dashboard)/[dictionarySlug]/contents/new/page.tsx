import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ContentForm } from "@/components/admin/content-form";
import { DictionaryComingSoon } from "@/components/admin/dictionary-coming-soon";
import {
  isDictionaryFeatureReady,
  requireDictionary,
} from "@/lib/admin/dictionary-features";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ dictionarySlug: string }>;
};

export default async function NewContentPage({ params }: Props) {
  const { dictionarySlug } = await params;
  const dictionary = await requireDictionary(dictionarySlug);
  if (!isDictionaryFeatureReady(dictionary.slug)) {
    return <DictionaryComingSoon dictionaryName={dictionary.name} />;
  }

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
          href={`/admin/${dictionarySlug}/contents`}
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

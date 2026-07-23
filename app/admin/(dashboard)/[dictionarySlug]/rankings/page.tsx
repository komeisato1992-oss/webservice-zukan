import { DictionaryComingSoon } from "@/components/admin/dictionary-coming-soon";
import { RankingsEditor } from "@/components/admin/rankings-editor";
import {
  getDictionaryBySlug,
  isFallbackDictionary,
} from "@/lib/admin/dictionaries";
import {
  ensureRankingDraft,
  purposesForDictionarySlug,
} from "@/lib/cms/rankings";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ dictionarySlug: string }>;
};

export default async function AdminRankingsPage({ params }: Props) {
  const { dictionarySlug } = await params;
  const dictionary = await getDictionaryBySlug(dictionarySlug);
  if (!dictionary || isFallbackDictionary(dictionary)) notFound();

  if (dictionary.slug !== "server" && dictionary.slug !== "domain") {
    return <DictionaryComingSoon dictionaryName={dictionary.name} />;
  }

  const isDomain = dictionary.slug === "domain";
  const purposeOptions = purposesForDictionarySlug(dictionary.slug);
  const supabase = await createClient();
  const { draft, errorMessage } = await ensureRankingDraft(
    supabase as never,
    dictionary.id,
    purposeOptions,
  );

  const servicesPromise = supabase
    .from("services")
    .select("id, name, slug, is_site_visible, is_published")
    .eq("dictionary_id", dictionary.id)
    .order("display_order", { ascending: true });

  const plansPromise = isDomain
    ? Promise.resolve({ data: [] as { id: string; service_id: string; name: string; is_published: boolean }[] })
    : supabase
        .from("service_plans")
        .select("id, service_id, name, is_published")
        .eq("is_published", true)
        .order("display_order", { ascending: true });

  const [{ data: services }, { data: plans }] = await Promise.all([
    servicesPromise,
    plansPromise,
  ]);

  if (!draft) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-10 text-center text-sm text-amber-950">
        <p className="font-medium">
          {errorMessage ??
            "ランキング管理テーブルが見つかりません。マイグレーションを適用してください。"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isDomain ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          ドメイン図鑑向けカテゴリ（5種）のみ表示。ランキングはサービス単位で管理します。
        </p>
      ) : null}
      <RankingsEditor
        dictionaryId={dictionary.id}
        initialPayload={draft.payload}
        publishedPayload={draft.published_snapshot}
        services={services ?? []}
        plans={plans ?? []}
        changeCount={draft.change_count ?? 0}
        purposeOptions={purposeOptions}
        hidePlanSelect={isDomain}
      />
    </div>
  );
}

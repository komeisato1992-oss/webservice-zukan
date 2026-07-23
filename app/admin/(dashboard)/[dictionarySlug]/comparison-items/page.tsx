import { DictionaryComingSoon } from "@/components/admin/dictionary-coming-soon";
import { DomainComparisonItemsEditor } from "@/components/admin/domain/domain-comparison-items-editor";
import { ensureDomainComparisonItems } from "@/lib/actions/domain-comparison-items";
import {
  getDictionaryBySlug,
  isFallbackDictionary,
} from "@/lib/admin/dictionaries";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ dictionarySlug: string }>;
};

export default async function ComparisonItemsPage({ params }: Props) {
  const { dictionarySlug } = await params;
  const dictionary = await getDictionaryBySlug(dictionarySlug);
  if (!dictionary || isFallbackDictionary(dictionary)) notFound();

  if (dictionary.slug === "server") {
    redirect(`/admin/server/comparison-fields`);
  }

  if (dictionary.slug !== "domain") {
    return <DictionaryComingSoon dictionaryName={dictionary.name} />;
  }

  const { items, errorMessage } = await ensureDomainComparisonItems(
    dictionary.id,
  );

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-10 text-center text-sm text-amber-950">
        <p className="font-medium">{errorMessage}</p>
      </div>
    );
  }

  return <DomainComparisonItemsEditor initialItems={items} />;
}

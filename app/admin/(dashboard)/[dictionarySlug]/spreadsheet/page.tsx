import { SpreadsheetSyncPanel } from "@/components/admin/spreadsheet-sync-panel";
import { getSpreadsheetPageDataAction } from "@/lib/actions/spreadsheet";
import { redirect } from "next/navigation";
import { DictionaryComingSoon } from "@/components/admin/dictionary-coming-soon";
import {
  isDictionaryFeatureReady,
  requireDictionary,
} from "@/lib/admin/dictionary-features";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ dictionarySlug: string }>;
};

export default async function AdminSpreadsheetPage({ params }: Props) {
  const { dictionarySlug } = await params;
  const dictionary = await requireDictionary(dictionarySlug);
  if (!isDictionaryFeatureReady(dictionary.slug)) {
    return <DictionaryComingSoon dictionaryName={dictionary.name} />;
  }

  const result = await getSpreadsheetPageDataAction();
  if (!result.ok || !result.data) {
    redirect("/admin/login");
  }

  return <SpreadsheetSyncPanel initial={result.data} />;
}

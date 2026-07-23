import { BulkServiceUpdatePanel } from "@/components/admin/bulk-service-update-panel";
import {
  listBulkScrapingJobsAction,
  listBulkUpdateTargetsAction,
} from "@/lib/actions/bulk-scraping";
import { DictionaryComingSoon } from "@/components/admin/dictionary-coming-soon";
import {
  isDictionaryFeatureReady,
  requireDictionary,
} from "@/lib/admin/dictionary-features";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ dictionarySlug: string }>;
};

export default async function AdminBulkUpdatePage({ params }: Props) {
  const { dictionarySlug } = await params;
  const dictionary = await requireDictionary(dictionarySlug);
  if (!isDictionaryFeatureReady(dictionary.slug)) {
    return <DictionaryComingSoon dictionaryName={dictionary.name} />;
  }

  const [targets, jobs] = await Promise.all([
    listBulkUpdateTargetsAction(),
    listBulkScrapingJobsAction(),
  ]);

  return (
    <BulkServiceUpdatePanel
      initialTargets={targets.targets}
      initialJobs={jobs.jobs}
    />
  );
}

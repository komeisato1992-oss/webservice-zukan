import { BulkServiceUpdatePanel } from "@/components/admin/bulk-service-update-panel";
import {
  listBulkScrapingJobsAction,
  listBulkUpdateTargetsAction,
} from "@/lib/actions/bulk-scraping";

export const dynamic = "force-dynamic";

export default async function AdminBulkUpdatePage() {
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

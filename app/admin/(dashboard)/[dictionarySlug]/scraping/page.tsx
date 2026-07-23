import Link from "next/link";
import { ScrapingCandidatesPanel } from "@/components/admin/cms/scraping-candidates-panel";
import { BulkServiceUpdatePanel } from "@/components/admin/bulk-service-update-panel";
import {
  listBulkScrapingJobsAction,
  listBulkUpdateTargetsAction,
} from "@/lib/actions/bulk-scraping";
import { createClient } from "@/lib/supabase/server";
import type { ScrapingCandidate } from "@/lib/cms/types";
import { DictionaryComingSoon } from "@/components/admin/dictionary-coming-soon";
import {
  isDictionaryFeatureReady,
  requireDictionary,
} from "@/lib/admin/dictionary-features";

export const dynamic = "force-dynamic";

const CANDIDATE_COLUMNS =
  "id, scraping_run_id, service_id, plan_id, field_key, field_label, current_published_value, current_draft_value, candidate_value, evidence, source_url, confidence, fetched_at, status, reviewed_by, reviewed_at, created_at, updated_at";

type Props = {
  params: Promise<{ dictionarySlug: string }>;
};

export default async function AdminScrapingPage({ params }: Props) {
  const { dictionarySlug } = await params;
  const dictionary = await requireDictionary(dictionarySlug);
  if (!isDictionaryFeatureReady(dictionary.slug)) {
    return <DictionaryComingSoon dictionaryName={dictionary.name} />;
  }

  const supabase = await createClient();

  const [
    { data: candidates },
    { data: services },
    { data: recentRuns },
    targets,
    jobs,
  ] = await Promise.all([
    supabase
      .from("scraping_candidates")
      .select(CANDIDATE_COLUMNS)
      .eq("status", "pending")
      .order("fetched_at", { ascending: false })
      .limit(200),
    supabase
      .from("services")
      .select("id, name, slug, is_published")
      .order("name", { ascending: true }),
    supabase
      .from("scraping_runs")
      .select(
        "id, service_id, provider, status, started_at, completed_at, found_count, missing_count, error_message",
      )
      .order("started_at", { ascending: false })
      .limit(20),
    listBulkUpdateTargetsAction(),
    listBulkScrapingJobsAction(),
  ]);

  const serviceNameById = new Map(
    (services ?? []).map((s) => [s.id, s.name] as const),
  );

  return (
    <div className="space-y-8 pb-28">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">スクレイピング</h1>
        <p className="mt-1 text-sm text-slate-600">
          取得結果は自動公開されず、候補としてドラフト確認後に採用します。
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">一括取得</h2>
        <BulkServiceUpdatePanel
          initialTargets={targets.targets}
          initialJobs={jobs.jobs}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            確認待ち候補
            <span className="ml-2 text-sm font-normal text-slate-500">
              {(candidates ?? []).length} 件
            </span>
          </h2>
          <Link
            href={`/admin/${dictionarySlug}/services`}
            className="text-sm text-blue-700 hover:underline"
          >
            サービス一覧へ
          </Link>
        </div>
        <div className="space-y-2">
          {(candidates ?? []).length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
              確認待ちの候補はありません。
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                サービス名は各カードの項目から判別できます。詳細編集はサービス編集の「取得候補」へ。
              </p>
              <ScrapingCandidatesPanel
                candidates={
                  ((candidates ?? []).map((c) => ({
                    ...c,
                    field_label: `${serviceNameById.get(c.service_id) ?? ""} · ${c.field_label ?? c.field_key}`,
                  })) as ScrapingCandidate[])
                }
              />
            </>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">最近の実行</h2>
        <ul className="space-y-2">
          {(recentRuns ?? []).map((run) => (
            <li
              key={run.id}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-900">
                  {serviceNameById.get(run.service_id) ?? run.service_id}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                  {run.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {run.provider} · 取得 {run.found_count ?? 0} / 欠落{" "}
                {run.missing_count ?? 0}
                {run.started_at
                  ? ` · ${new Date(run.started_at).toLocaleString("ja-JP")}`
                  : null}
              </p>
              {run.error_message ? (
                <p className="mt-1 text-xs text-red-600">{run.error_message}</p>
              ) : null}
            </li>
          ))}
          {(recentRuns ?? []).length === 0 ? (
            <li className="text-sm text-slate-500">実行履歴はまだありません。</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

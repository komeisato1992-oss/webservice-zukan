import { RankingsEditor } from "@/components/admin/rankings-editor";
import { ensureRankingDraft } from "@/lib/cms/rankings";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminRankingsPage() {
  const supabase = await createClient();
  const { draft, errorMessage } = await ensureRankingDraft(supabase as never);

  const [{ data: services }, { data: plans }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, slug, is_site_visible, is_published")
      .order("display_order", { ascending: true }),
    supabase
      .from("service_plans")
      .select("id, service_id, name, is_published")
      .eq("is_published", true)
      .order("display_order", { ascending: true }),
  ]);

  if (!draft) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-10 text-center text-sm text-amber-950">
        <p className="font-medium">
          {errorMessage ??
            "ランキング管理テーブルが見つかりません。マイグレーションを適用してください。"}
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-amber-900/80">
          Supabase SQL Editor で
          <code className="mx-1 rounded bg-white/80 px-1">
            202607220003_ranking_rls.sql
          </code>
          を実行後、このページを再読み込みしてください。
        </p>
      </div>
    );
  }

  return (
    <RankingsEditor
      initialPayload={draft.payload}
      publishedPayload={draft.published_snapshot}
      services={services ?? []}
      plans={plans ?? []}
      changeCount={draft.change_count ?? 0}
    />
  );
}

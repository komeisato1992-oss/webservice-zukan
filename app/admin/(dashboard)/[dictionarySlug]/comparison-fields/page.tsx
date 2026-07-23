import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ComparisonFieldsCms } from "@/components/admin/cms/comparison-fields-cms";
import type { ComparisonField } from "@/lib/types/database";
import { DictionaryComingSoon } from "@/components/admin/dictionary-coming-soon";
import {
  isDictionaryFeatureReady,
  requireDictionary,
} from "@/lib/admin/dictionary-features";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ dictionarySlug: string }>;
  searchParams: Promise<{ category?: string }>;
};

const FIELD_COLUMNS =
  "id, category_id, name, slug, field_type, unit, description, display_group, select_options, display_order, is_filterable, is_highlighted, is_published, value_source, compare_rule, show_in_top_featured, top_featured_display_order, show_in_top_table, top_table_display_order, show_in_compare_page, compare_page_display_order, publish_status, has_unpublished_changes, draft_show_in_top_featured, draft_show_in_top_table, draft_show_in_compare_page, created_at, updated_at";

export default async function ComparisonFieldsPage({ params, searchParams }: Props) {
  const { dictionarySlug } = await params;
  const dictionary = await requireDictionary(dictionarySlug);
  if (!isDictionaryFeatureReady(dictionary.slug)) {
    return <DictionaryComingSoon dictionaryName={dictionary.name} />;
  }

  const search = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("display_order", { ascending: true });

  const categoryId = search.category || (categories ?? [])[0]?.id || "";

  let fieldsQuery = supabase
    .from("comparison_fields")
    .select(FIELD_COLUMNS)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (categoryId) {
    fieldsQuery = fieldsQuery.eq("category_id", categoryId);
  }

  const { data: fields } = await fieldsQuery;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">比較項目管理</h1>
          <p className="mt-1 text-sm text-slate-600">
            表示場所はチェックだけで変更できます（コード修正不要）。下書き保存後に公開へ反映してください。
          </p>
        </div>
        <Link
          href={`/admin/${dictionarySlug}/comparison-fields/new`}
          className="inline-flex h-12 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          新規追加
        </Link>
      </div>

      <form className="rounded-2xl border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium text-slate-700">
          カテゴリ
          <select
            name="category"
            defaultValue={categoryId}
            className="mt-1 h-12 w-full rounded-lg border border-slate-300 px-3 text-base"
          >
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="mt-3 h-12 w-full rounded-lg bg-slate-900 px-4 text-sm font-medium text-white sm:w-auto"
        >
          切り替える
        </button>
      </form>

      <ComparisonFieldsCms fields={(fields as ComparisonField[]) ?? []} />
    </div>
  );
}

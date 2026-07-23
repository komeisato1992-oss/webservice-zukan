import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DictionaryComingSoon } from "@/components/admin/dictionary-coming-soon";
import {
  isDictionaryFeatureReady,
  requireDictionary,
} from "@/lib/admin/dictionary-features";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ dictionarySlug: string }>;
};

export default async function AdminCategoriesPage({ params }: Props) {
  const { dictionarySlug } = await params;
  const dictionary = await requireDictionary(dictionarySlug);
  if (!isDictionaryFeatureReady(dictionary.slug)) {
    return <DictionaryComingSoon dictionaryName={dictionary.name} />;
  }

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">カテゴリ管理</h1>
          <p className="mt-1 text-sm text-slate-600">
            カテゴリ追加で URL `/[slug]/services` が再利用されます
          </p>
        </div>
        <Link
          href={`/admin/${dictionarySlug}/categories/new`}
          className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          カテゴリ追加
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">名前</th>
              <th className="px-4 py-3 font-medium">スラッグ</th>
              <th className="px-4 py-3 font-medium">公開</th>
              <th className="px-4 py-3 font-medium">表示順</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(categories ?? []).map((category) => (
              <tr key={category.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {category.name}
                </td>
                <td className="px-4 py-3 text-slate-600">{category.slug}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      category.is_published
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {category.is_published ? "公開" : "非公開"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{category.display_order}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/${dictionarySlug}/categories/${category.id}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    編集
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(categories ?? []).length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            カテゴリがありません。
          </p>
        ) : null}
      </div>
    </div>
  );
}

import Link from "next/link";
import {
  adminDictionaryPath,
  countServicesByDictionary,
  listDictionaries,
} from "@/lib/admin/dictionaries";

export const dynamic = "force-dynamic";

export default async function DictionariesPage() {
  const [dictionaries, serviceCounts] = await Promise.all([
    listDictionaries(),
    countServicesByDictionary(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">図鑑一覧</h1>
          <p className="mt-1 text-sm text-slate-600">
            管理対象の図鑑を確認・切り替えできます。
          </p>
        </div>
        <button
          type="button"
          disabled
          title="準備中"
          className="inline-flex h-12 cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-400"
        >
          ＋図鑑追加
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {dictionaries.map((dictionary) => {
          const count = serviceCounts[dictionary.id] ?? 0;
          return (
            <article
              key={dictionary.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {dictionary.name}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    slug: {dictionary.slug}
                  </p>
                </div>
                <span
                  className={`rounded-md px-2 py-1 text-xs font-medium ${
                    dictionary.is_public
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {dictionary.is_public ? "公開中" : "作成中"}
                </span>
              </div>

              {dictionary.description ? (
                <p className="mt-3 text-sm text-slate-600">
                  {dictionary.description}
                </p>
              ) : null}

              <p className="mt-4 text-sm text-slate-700">
                登録サービス数:{" "}
                <span className="font-semibold">{count}</span> 件
              </p>

              <div className="mt-5">
                <Link
                  href={adminDictionaryPath(dictionary.slug, "/services")}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
                >
                  編集
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {dictionaries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          図鑑がありません。マイグレーションを適用してください。
        </p>
      ) : null}
    </div>
  );
}

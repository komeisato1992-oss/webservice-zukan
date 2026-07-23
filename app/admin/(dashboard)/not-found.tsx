import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <p className="text-sm font-medium text-slate-500">404</p>
      <h1 className="mt-2 text-xl font-bold text-slate-900">
        ページが見つかりません
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        URLをご確認ください。図鑑を切り替えるか、サービス一覧へ戻ってください。
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/admin/dictionaries"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          図鑑一覧
        </Link>
        <Link
          href="/admin/server/services"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          サーバー図鑑のサービス一覧
        </Link>
      </div>
    </div>
  );
}

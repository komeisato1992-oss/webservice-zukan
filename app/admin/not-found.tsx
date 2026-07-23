import Link from "next/link";

/** 管理画面配下の404（本サイトHeader/Footerを使わない） */
export default function AdminRootNotFound() {
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-900">
          Webサービス図鑑 CMS
        </p>
        <p className="mt-4 text-sm font-medium text-slate-500">404</p>
        <h1 className="mt-2 text-xl font-bold text-slate-900">
          ページが見つかりません
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          管理画面のURLをご確認ください。
        </p>
        <Link
          href="/admin/server/services"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          サービス一覧へ
        </Link>
      </div>
    </div>
  );
}

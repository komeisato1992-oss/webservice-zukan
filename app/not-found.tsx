import Link from "next/link";
import { headers } from "next/headers";
import { SiteFooter, SiteHeader } from "@/components/site/header-footer";
import { CompareProvider } from "@/components/site/compare/compare-context";
import { SITE_BRAND } from "@/lib/site/brand";
import { buttonClass } from "@/components/site/ui";

export default async function NotFound() {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const isAdmin = pathname.startsWith("/admin");

  // 管理画面のルート未一致時は本サイトのヘッダーを出さない
  if (isAdmin) {
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

  return (
    <CompareProvider>
      <div className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">
          <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
            <p className="text-[13px] font-bold tracking-tight text-[var(--navy)]">
              {SITE_BRAND}
            </p>
            <p className="mt-3 text-sm font-medium text-[var(--text-muted)]">404</p>
            <h1 className="mt-2 text-[1.5rem] font-bold tracking-tight text-[var(--text-primary)] sm:text-[1.75rem]">
              ページが見つかりません。
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-body)]">
              URLが正しいかご確認ください。主要サービスの比較はTOPからご利用いただけます。
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <Link href="/server" className={buttonClass("primary", "md")}>
                TOPへ戻る
              </Link>
              <Link
                href="/server/services"
                className={buttonClass("secondary", "md")}
              >
                サービス一覧
              </Link>
              <Link
                href="/server#compare-categories"
                className={buttonClass("secondary", "md")}
              >
                比較表
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    </CompareProvider>
  );
}

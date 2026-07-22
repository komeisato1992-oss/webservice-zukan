import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site/header-footer";
import { CompareProvider } from "@/components/site/compare/compare-context";
import { SITE_BRAND } from "@/lib/site/brand";
import { buttonClass } from "@/components/site/ui";

export default function NotFound() {
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

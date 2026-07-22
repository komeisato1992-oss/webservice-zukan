import Link from "next/link";
import { SITE_BRAND } from "@/lib/site/brand";
import { buttonClass } from "@/components/site/ui";

export function DataUnavailable({
  title = "現在データを取得できません",
  description = "一時的に情報を表示できません。しばらくしてから再度お試しください。",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-[13px] font-bold tracking-tight text-[var(--navy)]">
        {SITE_BRAND}
      </p>
      <h1 className="mt-3 text-[1.375rem] font-bold tracking-tight text-[var(--text-primary)] sm:text-[1.5rem]">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--text-body)]">
        {description}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Link href="/server" className={buttonClass("primary", "md")}>
          TOPへ戻る
        </Link>
        <Link href="/server/services" className={buttonClass("secondary", "md")}>
          サービス一覧
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Breadcrumb, buttonClass } from "@/components/site/ui";

export function StaticPageShell({
  title,
  brand,
  homePath,
  children,
}: {
  title: string;
  /** @deprecated path は SEO 側で管理。互換のため残す */
  path?: string;
  brand: string;
  homePath: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumb
        items={[
          { href: homePath, label: brand },
          { label: title },
        ]}
      />
      <h1 className="mt-3 text-[1.625rem] font-bold tracking-tight text-[var(--text-primary)] sm:text-[2rem]">
        {title}
      </h1>
      <div className="mt-5 space-y-5 text-[14px] leading-relaxed text-[var(--text-body)] sm:text-[15px]">
        {children}
      </div>
      <div className="mt-8">
        <Link href={homePath} className={buttonClass("secondary", "md")}>
          TOPへ戻る
        </Link>
      </div>
    </div>
  );
}

export function StaticSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-[1.0625rem]">
        {title}
      </h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

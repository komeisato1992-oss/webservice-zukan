import Image from "next/image";
import Link from "next/link";
import { categoryPath } from "@/lib/links";
import {
  PRIMARY_CATEGORY_SLUG,
  SITE_BRAND,
  SITE_FOOTER_GROUPS,
} from "@/lib/site/brand";
import { SiteHeaderClient } from "@/components/site/site-header-client";

export function SiteHeader() {
  const servicesHref = categoryPath(PRIMARY_CATEGORY_SLUG, "services");
  return <SiteHeaderClient servicesHref={servicesHref} />;
}

export function SiteFooter() {
  return (
    <footer className="site-footer-hero relative mt-auto overflow-hidden text-white">
      <div className="site-footer-hero-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="site-footer-hero-overlay pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-[var(--container-max)] px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
          <div className="col-span-2 min-w-0 sm:col-span-2 lg:col-span-1">
            <Link
              href="/server"
              className="inline-flex max-w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label={SITE_BRAND}
            >
              <Image
                src="/images/site-logo.png"
                alt={SITE_BRAND}
                width={440}
                height={96}
                sizes="(max-width: 640px) 280px, 440px"
                className="h-auto w-full max-w-[27.5rem] object-contain object-left"
              />
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-white/80 sm:mt-4 sm:text-sm">
              おすすめのレンタルサーバーを料金・機能・用途別に比較できる情報サイトです。
            </p>
          </div>
          {SITE_FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-[10px] font-semibold tracking-[0.12em] text-white/55 uppercase">
                {group.title}
              </p>
              <ul className="mt-2 space-y-1.5">
                {group.links.map((link) => (
                  <li key={`${group.title}-${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-xs text-white/85 hover:text-white sm:text-[13px]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-7 border-t border-white/15 pt-4 space-y-1.5">
          <p className="text-[11px] text-white/55">
            当サイトはアフィリエイト広告を利用しています。
          </p>
          <p className="text-[11px] text-white/50">
            © {new Date().getFullYear()} {SITE_BRAND}
          </p>
        </div>
      </div>
    </footer>
  );
}

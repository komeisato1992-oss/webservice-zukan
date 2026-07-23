"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SITE_BRAND, SITE_NAV } from "@/lib/site/brand";
import {
  DOMAIN_BRAND,
  DOMAIN_LOGO_HEIGHT,
  DOMAIN_LOGO_SRC,
  DOMAIN_LOGO_WIDTH,
  DOMAIN_NAV,
} from "@/lib/site/domain-brand";
import { cn } from "@/components/site/ui";

type Props = {
  servicesHref: string;
};

/** サーバー図鑑ロゴ原寸 825×179。ヘッダーは従来の約2倍高さで表示 */
const LOGO_WIDTH = 280;
const LOGO_HEIGHT = 61;

export function SiteHeaderClient({ servicesHref }: Props) {
  const [compact, setCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const isDomain = pathname?.startsWith("/domain") ?? false;

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const homeHref = isDomain ? "/domain" : "/server";
  const brand = isDomain ? DOMAIN_BRAND : SITE_BRAND;

  const navItems = isDomain
    ? DOMAIN_NAV.map((item) => ({ href: item.href, label: item.label }))
    : SITE_NAV.map((item) =>
        item.label === "サービス一覧"
          ? { ...item, href: servicesHref }
          : item.label === "比較"
            ? {
                ...item,
                href: servicesHref.replace(/\/services\/?$/, "/compare"),
              }
            : item,
      );

  function isActive(href: string) {
    if (href.includes("#")) return false;
    if (href === "/server") {
      return pathname === "/server" || pathname === "/server/";
    }
    if (href === "/domain") {
      return pathname === "/domain" || pathname === "/domain/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-[box-shadow,height]",
        isDomain ? "site-header-domain" : "site-header-navy",
        compact && "shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[var(--container-max)] items-center justify-between gap-3 px-4 sm:px-6",
          compact
            ? "h-[var(--header-height-compact)]"
            : "h-[var(--header-height)]",
        )}
      >
        <Link
          href={homeHref}
          className={cn(
            "inline-flex min-w-0 shrink items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
            isDomain
              ? "max-w-[min(100%,16.5rem)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--domain-navy,#045a57)] sm:max-w-[min(100%,19rem)]"
              : "max-w-[min(100%,16.5rem)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--navy-deep)] sm:max-w-[min(100%,19rem)]",
          )}
          aria-label={brand}
        >
          {isDomain ? (
            <Image
              src={DOMAIN_LOGO_SRC}
              alt={DOMAIN_BRAND}
              width={DOMAIN_LOGO_WIDTH}
              height={DOMAIN_LOGO_HEIGHT}
              priority
              className={cn(
                "h-14 w-auto max-w-full object-contain object-left",
                compact ? "sm:h-[3.25rem]" : "sm:h-16",
              )}
            />
          ) : (
            <Image
              src="/images/site-logo.png"
              alt={SITE_BRAND}
              width={LOGO_WIDTH}
              height={LOGO_HEIGHT}
              priority
              className={cn(
                "h-14 w-auto max-w-full object-contain object-left",
                compact ? "sm:h-[3.25rem]" : "sm:h-16",
              )}
            />
          )}
        </Link>

        <nav
          className="ml-auto hidden min-w-0 shrink-0 items-center gap-0.5 lg:flex"
          aria-label="メイン"
        >
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={cn(
                  "relative rounded-md px-2.5 py-1.5 text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35",
                  active
                    ? "font-medium text-white"
                    : "text-white/75 hover:bg-white/8 hover:text-white",
                )}
              >
                {item.label}
                {active ? (
                  <span
                    className={cn(
                      "absolute inset-x-2.5 -bottom-0.5 h-0.5 rounded-full",
                      isDomain ? "bg-[#9FE8E2]" : "bg-[#7EB6FF]",
                    )}
                    aria-hidden
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="site-mobile-nav"
          aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
        </button>
      </div>

      {menuOpen ? (
        <nav
          id="site-mobile-nav"
          aria-label="モバイルメニュー"
          className={cn(
            "border-t border-white/15 lg:hidden",
            isDomain ? "bg-[rgba(5,102,99,0.98)]" : "bg-[rgba(6,21,47,0.98)]",
          )}
        >
          <ul className="mx-auto flex max-w-[var(--container-max)] flex-col px-2 py-2 sm:px-4">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={`m-${item.href}-${item.label}`}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex min-h-11 items-center rounded-md px-3 text-[14px] transition",
                      active
                        ? "bg-white/12 font-semibold text-white"
                        : "text-white/85 hover:bg-white/8 hover:text-white",
                    )}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

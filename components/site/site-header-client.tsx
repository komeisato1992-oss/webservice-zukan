"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SITE_BRAND, SITE_NAV } from "@/lib/site/brand";
import { cn } from "@/components/site/ui";

type Props = {
  servicesHref: string;
};

/** ロゴ原寸 825×179。ヘッダーは従来の約2倍高さで表示 */
const LOGO_WIDTH = 280;
const LOGO_HEIGHT = 61;

export function SiteHeaderClient({ servicesHref }: Props) {
  const [compact, setCompact] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const compareHref = servicesHref.replace(/\/services\/?$/, "/compare");

  const navItems = SITE_NAV.map((item) =>
    item.label === "サービス一覧"
      ? { ...item, href: servicesHref }
      : item.label === "比較"
        ? { ...item, href: compareHref }
        : item,
  );

  function isActive(href: string) {
    if (href.includes("#")) {
      return false;
    }
    if (href === "/server") {
      return pathname === "/server" || pathname === "/server/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header
      className={cn(
        "site-header-navy sticky top-0 z-50 border-b transition-[box-shadow,height]",
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
          href="/server"
          className="inline-flex min-w-0 max-w-[min(100%,16.5rem)] shrink items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--navy-deep)] sm:max-w-[min(100%,19rem)]"
          aria-label={SITE_BRAND}
        >
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
        </Link>

        <nav
          className="ml-auto hidden min-w-0 shrink-0 items-center gap-0.5 lg:flex"
          aria-label="メイン"
        >
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
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
                    className="absolute inset-x-2.5 -bottom-0.5 h-0.5 rounded-full bg-[#7EB6FF]"
                    aria-hidden
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/lib/actions/admin";
import type { Dictionary } from "@/lib/types/database";

const SERVER_NAV_ITEMS = [
  { path: "/services", label: "サービス一覧" },
  { path: "/comparison-fields", label: "比較項目管理" },
  { path: "/rankings", label: "ランキング管理" },
  { path: "/scraping", label: "スクレイピング" },
  { path: "/spreadsheet", label: "Google Sheets" },
  { path: "/history", label: "更新履歴" },
  { path: "/settings", label: "設定" },
] as const;

const DOMAIN_NAV_ITEMS = [
  { path: "/services", label: "サービス一覧" },
  { path: "/comparison-items", label: "比較項目管理" },
  { path: "/rankings", label: "ランキング管理" },
] as const;

function navItemsForSlug(slug: string) {
  return slug === "domain" ? DOMAIN_NAV_ITEMS : SERVER_NAV_ITEMS;
}

function resolveDictionarySlug(
  pathname: string,
  dictionaries: Dictionary[],
): string {
  const match = pathname.match(/^\/admin\/([^/]+)/);
  const slug = match?.[1];
  if (slug && dictionaries.some((d) => d.slug === slug)) {
    return slug;
  }
  return dictionaries[0]?.slug ?? "server";
}

function resolveSubPath(pathname: string, dictionarySlug: string): string {
  const prefix = `/admin/${dictionarySlug}`;
  if (pathname === prefix) return "/services";
  if (pathname.startsWith(`${prefix}/`)) {
    return pathname.slice(prefix.length) || "/services";
  }
  return "/services";
}

export function AdminSidebar({
  email,
  dictionaries,
}: {
  email?: string | null;
  dictionaries: Dictionary[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const currentSlug = resolveDictionarySlug(pathname, dictionaries);
  const currentSubPath = resolveSubPath(pathname, currentSlug);

  const nav = navItemsForSlug(currentSlug).map((item) => ({
    href: `/admin/${currentSlug}${item.path}`,
    label: item.label,
    path: item.path,
  }));

  function handleDictionaryChange(nextSlug: string) {
    if (!nextSlug || nextSlug === currentSlug) return;
    let sub = currentSubPath;
    if (nextSlug === "domain") {
      if (sub.startsWith("/comparison-fields")) sub = "/comparison-items";
      if (
        sub.startsWith("/scraping") ||
        sub.startsWith("/spreadsheet") ||
        sub.startsWith("/history") ||
        sub.startsWith("/settings")
      ) {
        sub = "/services";
      }
    } else if (nextSlug === "server" && sub.startsWith("/comparison-items")) {
      sub = "/comparison-fields";
    }
    router.push(`/admin/${nextSlug}${sub}`);
    setOpen(false);
  }

  const brandBlock = (
    <div className="space-y-3">
      <Link
        href="/admin/dictionaries"
        className="block text-base font-bold leading-snug text-slate-900 sm:text-lg"
      >
        Webサービス図鑑 CMS
      </Link>
      {email ? (
        <p className="truncate text-xs text-slate-500">{email}</p>
      ) : null}
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">
          図鑑切替
        </span>
        <select
          value={currentSlug}
          onChange={(e) => handleDictionaryChange(e.target.value)}
          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
        >
          {dictionaries.map((dictionary) => (
            <option key={dictionary.id} value={dictionary.slug}>
              {dictionary.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  const navLinks = (
    <>
      <Link
        href="/admin/dictionaries"
        onClick={() => setOpen(false)}
        className={`rounded-lg px-3 py-2.5 text-sm ${
          pathname.startsWith("/admin/dictionaries")
            ? "bg-blue-50 font-medium text-blue-700"
            : "text-slate-700 hover:bg-slate-50"
        }`}
      >
        図鑑一覧
      </Link>
      {nav.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`rounded-lg px-3 py-2.5 text-sm ${
              active
                ? "bg-blue-50 font-medium text-blue-700"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">{brandBlock}</div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-1 shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            メニュー
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-1">{navLinks}</nav>
          <form action={logoutAction} className="mt-3">
            <button
              type="submit"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
            >
              ログアウト
            </button>
          </form>
        </div>
      ) : null}

      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-slate-200 px-5 py-5">{brandBlock}</div>
        <nav className="flex flex-1 flex-col gap-1 p-3">{navLinks}</nav>
        <div className="border-t border-slate-200 p-3">
          <Link
            href="/"
            className="mb-2 block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            本サイトを見る
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              ログアウト
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

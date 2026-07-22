"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/lib/actions/admin";

const NAV = [
  { href: "/admin/services", label: "サービス一覧" },
  { href: "/admin/comparison-fields", label: "比較項目管理" },
  { href: "/admin/rankings", label: "ランキング管理" },
  { href: "/admin/scraping", label: "スクレイピング" },
  { href: "/admin/spreadsheet", label: "Google Sheets" },
  { href: "/admin/history", label: "更新履歴" },
  { href: "/admin/settings", label: "設定" },
];

export function AdminSidebar({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Link href="/admin" className="font-semibold text-slate-900">
          管理画面
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          メニュー
        </button>
      </div>

      {open ? (
        <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm ${
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href))
                    ? "bg-blue-50 font-medium text-blue-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
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
        <div className="border-b border-slate-200 px-5 py-5">
          <Link href="/admin" className="text-lg font-bold text-slate-900">
            管理画面
          </Link>
          {email ? (
            <p className="mt-1 truncate text-xs text-slate-500">{email}</p>
          ) : null}
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
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
        </nav>
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

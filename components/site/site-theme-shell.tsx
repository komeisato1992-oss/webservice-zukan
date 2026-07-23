"use client";

import { usePathname } from "next/navigation";

/**
 * パスに応じて data-site-theme を付与し、ドメイン図鑑だけエメラルドグリーン変数を有効化する。
 * サーバー図鑑（/server 等）には影響しない。
 */
export function SiteThemeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = pathname?.startsWith("/domain") ? "domain" : "server";

  return (
    <div data-site-theme={theme} className="flex min-h-full flex-1 flex-col">
      {children}
    </div>
  );
}

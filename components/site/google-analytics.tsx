"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * GA4（本番の一般公開ページのみ）。測定IDは NEXT_PUBLIC_GA_MEASUREMENT_ID。
 * /admin 以下・localhost・Preview・本番以外のホストでは読み込まない。
 * @see https://nextjs.org/docs/app/guides/third-party-libraries#google-analytics
 */
const PRODUCTION_HOSTS = new Set([
  "webservice-zukan.jp",
  "www.webservice-zukan.jp",
]);

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function shouldLoadGa(pathname: string): boolean {
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname;
  if (!PRODUCTION_HOSTS.has(hostname)) return false;
  if (isAdminPath(pathname)) return false;

  return true;
}

export function SiteGoogleAnalytics() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(shouldLoadGa(pathname));
  }, [pathname]);

  if (!enabled) return null;

  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!gaId) return null;

  return <GoogleAnalytics gaId={gaId} />;
}

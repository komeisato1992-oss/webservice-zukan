import { type NextRequest } from "next/server";
import { hasSupabasePublicEnv } from "@/lib/env";
import { getSiteUrl } from "@/lib/site/seo";
import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse } from "next/server";

function redirectToCanonicalHost(request: NextRequest) {
  // ローカル開発ではホスト正規化しない
  if (process.env.NODE_ENV !== "production") return null;

  let canonicalHost: string;
  try {
    canonicalHost = new URL(getSiteUrl()).host;
  } catch {
    return null;
  }

  const requestHost = request.headers.get("host");
  if (!requestHost || requestHost === canonicalHost) return null;

  // Vercel プレビュー / デプロイ固有ホストはそのまま
  if (
    requestHost.endsWith(".vercel.app") ||
    requestHost.startsWith("localhost") ||
    requestHost.startsWith("127.0.0.1")
  ) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.host = canonicalHost;
  url.protocol = "https";
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export async function middleware(request: NextRequest) {
  const hostRedirect = redirectToCanonicalHost(request);
  if (hostRedirect) return hostRedirect;

  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  if (!hasSupabasePublicEnv()) {
    if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("error", "env");
      return NextResponse.redirect(url);
    }
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * sitemap.xml / robots.txt は SEO 用メタデータルートのため
     * セッション更新ミドルウェアを通さない（Content-Type を壊さない）
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

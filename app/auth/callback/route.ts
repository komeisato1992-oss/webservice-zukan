import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/admin";
  }
  // パスワード再設定・管理画面のみ許可
  if (next === "/reset-password" || next.startsWith("/admin")) {
    return next;
  }
  return "/admin";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const login = new URL("/admin/login", origin);
      login.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}

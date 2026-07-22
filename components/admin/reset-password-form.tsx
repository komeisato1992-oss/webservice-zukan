"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FormMessage } from "@/components/admin/form-ui";
import type { ActionResult } from "@/lib/actions/admin";

export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function prepareSession() {
      const supabase = createClient();
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash,
      );
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashType = hashParams.get("type");

      if (code) {
        // PKCE: サーバー側コールバックで cookie セッションを確立
        window.location.replace(
          `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent("/reset-password")}`,
        );
        return;
      }

      if (tokenHash && (type === "recovery" || type === "email")) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type === "email" ? "email" : "recovery",
        });
        if (error && !cancelled) {
          setSessionError(
            "リセットリンクが無効か期限切れです。ログイン画面から再送してください。",
          );
          return;
        }
        url.searchParams.delete("token_hash");
        url.searchParams.delete("type");
        window.history.replaceState({}, "", url.pathname);
      } else if (
        accessToken &&
        refreshToken &&
        (hashType === "recovery" || !hashType)
      ) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error && !cancelled) {
          setSessionError(
            "リセットリンクが無効か期限切れです。ログイン画面から再送してください。",
          );
          return;
        }
        window.history.replaceState({}, "", url.pathname);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;
      if (!user) {
        setSessionError(
          "リセット用セッションがありません。ログイン画面からパスワード再設定メールを送信してください。",
        );
        return;
      }
      setReady(true);
    }

    void prepareSession();
    return () => {
      cancelled = true;
    };
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password.length < 8) {
      setResult({
        ok: false,
        message: "パスワードは8文字以上で入力してください。",
      });
      return;
    }
    if (password !== confirm) {
      setResult({ ok: false, message: "確認用パスワードが一致しません。" });
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setResult({
          ok: false,
          message: error.message || "パスワードの更新に失敗しました。",
        });
        return;
      }
      setResult({
        ok: true,
        message: "パスワードを更新しました。管理画面へ移動します…",
      });
      window.setTimeout(() => {
        router.replace("/admin");
        router.refresh();
      }, 800);
    });
  }

  if (sessionError) {
    return (
      <div className="space-y-4">
        <FormMessage result={{ ok: false, message: sessionError }} />
        <a
          href="/admin/login"
          className="inline-flex text-sm font-medium text-blue-700 hover:underline"
        >
          ログイン画面へ戻る
        </a>
      </div>
    );
  }

  if (!ready) {
    return (
      <p className="text-sm text-slate-600">セッションを確認しています…</p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormMessage result={result} />
      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          新しいパスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
        />
      </div>
      <div>
        <label
          htmlFor="confirm"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          新しいパスワード（確認）
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "更新中…" : "パスワードを更新する"}
      </button>
    </form>
  );
}

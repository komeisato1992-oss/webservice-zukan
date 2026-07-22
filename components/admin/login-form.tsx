"use client";

import { useActionState, useState, useTransition } from "react";
import {
  loginAction,
  type ActionResult,
} from "@/lib/actions/admin";
import { FormMessage, SubmitButton } from "@/components/admin/form-ui";
import { createClient } from "@/lib/supabase/client";

function initialMessage(error?: string | null): ActionResult | null {
  if (!error) return null;
  if (error === "unauthorized") {
    return { ok: false, message: "管理者権限がありません。" };
  }
  if (error === "env") {
    return {
      ok: false,
      message: "環境変数が未設定です。.env.local を確認してください。",
    };
  }
  return { ok: false, message: "ログインが必要です。" };
}

export function LoginForm({
  next,
  initialError,
}: {
  next: string;
  initialError?: string | null;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    loginAction,
    initialMessage(initialError),
  );
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [resetResult, setResetResult] = useState<ActionResult | null>(null);
  const [resetPending, startReset] = useTransition();

  function onResetSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!email) {
      setResetResult({
        ok: false,
        message: "メールアドレスを入力してください。",
      });
      return;
    }

    startReset(async () => {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) {
        setResetResult({
          ok: false,
          message: error.message || "リセットメールの送信に失敗しました。",
        });
        return;
      }
      setResetResult({
        ok: true,
        message:
          "パスワード再設定メールを送信しました。メール内のリンクから新しいパスワードを設定してください。",
      });
    });
  }

  if (mode === "reset") {
    return (
      <form onSubmit={onResetSubmit} className="space-y-4">
        <FormMessage result={resetResult} />
        <p className="text-sm text-slate-600">
          登録済みのメールアドレスに、パスワード再設定リンクを送信します。
        </p>
        <div>
          <label
            htmlFor="reset-email"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            メールアドレス
          </label>
          <input
            id="reset-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
          />
        </div>
        <button
          type="submit"
          disabled={resetPending}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {resetPending ? "送信中…" : "再設定メールを送信"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setResetResult(null);
          }}
          className="w-full text-center text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ログイン画面に戻る
        </button>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <FormMessage result={state} />
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
        />
      </div>
      <SubmitButton label="ログイン" pendingLabel="ログイン中…" />
      <button
        type="button"
        onClick={() => setMode("reset")}
        className="w-full text-center text-sm font-medium text-blue-700 hover:underline"
      >
        パスワードを忘れた方
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import {
  loginAction,
  type ActionResult,
} from "@/lib/actions/admin";
import { FormMessage, SubmitButton } from "@/components/admin/form-ui";

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
    </form>
  );
}

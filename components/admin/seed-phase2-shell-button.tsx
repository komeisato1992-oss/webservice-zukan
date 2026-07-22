"use client";

import { useState, useTransition } from "react";
import { seedPhase2ShellServicesAction } from "@/lib/actions/admin";

export function SeedPhase2ShellButton({ missingCount }: { missingCount: number }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (missingCount <= 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-700">
          Phase2 のサービス器が未登録です（残り {missingCount} 社）。
          プラン・比較値なしで公開状態として一括登録できます。
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await seedPhase2ShellServicesAction();
              setMessage(result.message);
              if (result.ok) {
                window.location.reload();
              }
            });
          }}
          className="inline-flex h-10 shrink-0 items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "登録中…" : "残りサービスを一括登録"}
        </button>
      </div>
      {message ? (
        <p className="mt-2 text-sm text-slate-600" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

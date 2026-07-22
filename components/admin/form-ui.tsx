"use client";

import { useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/lib/actions/admin";

export function FormMessage({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <div
      role="status"
      className={`rounded-lg border px-4 py-3 text-sm ${
        result.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {result.message}
      {result.fieldErrors ? (
        <ul className="mt-2 list-disc pl-5">
          {Object.entries(result.fieldErrors).flatMap(([key, messages]) =>
            (messages ?? []).map((msg) => (
              <li key={`${key}-${msg}`}>
                {key}: {msg}
              </li>
            )),
          )}
        </ul>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  label = "保存する",
  pendingLabel = "保存中…",
}: {
  label?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function UnsavedGuard({ dirty }: { dirty: boolean }) {
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
  return null;
}

export function ConfirmDeleteButton({
  action,
  label = "削除",
  confirmMessage = "本当に削除しますか？この操作は取り消せません。",
}: {
  action: (formData: FormData) => Promise<unknown>;
  label?: string;
  confirmMessage?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(async () => {
          const fd = new FormData();
          await action(fd);
        });
      }}
      className="inline-flex h-11 items-center justify-center rounded-lg border border-red-300 px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
    >
      {pending ? "削除中…" : label}
    </button>
  );
}

export function useDirtyForm() {
  const [dirty, setDirty] = useState(false);
  return {
    dirty,
    setDirty,
    markDirty: () => setDirty(true),
    resetDirty: () => setDirty(false),
    onChange: () => setDirty(true),
  };
}

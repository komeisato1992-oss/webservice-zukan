"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createDomainServiceAction,
} from "@/lib/actions/domain";
import type { ActionResult } from "@/lib/actions/admin";
import { FormMessage, SubmitButton } from "@/components/admin/form-ui";

export function DomainServiceCreateForm() {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    createDomainServiceAction,
    null,
  );

  return (
    <div className="space-y-4">
      <FormMessage result={state} />
      <form
        action={formAction}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <Field
          label="サービス名"
          name="name"
          required
          placeholder="お名前.com"
        />
        <Field
          label="slug"
          name="slug"
          required
          placeholder="onamae"
          hint="英小文字・数字・ハイフン"
        />
        <Field label="運営会社名" name="company_name" placeholder="GMO" />
        <Field
          label="公式サイトURL"
          name="official_url"
          type="url"
          placeholder="https://..."
        />
        <div className="flex flex-wrap gap-3 pt-2">
          <SubmitButton label="登録して編集へ" pendingLabel="登録中…" />
          <Link
            href="/admin/domain/services"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-50"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
      />
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </label>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import {
  deleteCategoryAction,
  saveCategoryAction,
  type ActionResult,
} from "@/lib/actions/admin";
import type { Category } from "@/lib/types/database";
import {
  FormMessage,
  SubmitButton,
  UnsavedGuard,
  useDirtyForm,
} from "@/components/admin/form-ui";

export function CategoryForm({ category }: { category?: Category | null }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    saveCategoryAction,
    null,
  );
  const [deleteState, setDeleteState] = useState<ActionResult | null>(null);
  const dirty = useDirtyForm();

  useEffect(() => {
    if (state?.ok) dirty.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when save succeeds
  }, [state]);

  return (
    <div className="space-y-4">
      <FormMessage result={state} />
      <FormMessage result={deleteState} />
      <UnsavedGuard dirty={dirty.dirty} />

      <form
        action={formAction}
        onChange={dirty.onChange}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        {category ? <input type="hidden" name="id" value={category.id} /> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="カテゴリ名" name="name" defaultValue={category?.name} required />
          <Field label="スラッグ" name="slug" defaultValue={category?.slug} required hint="URLに使われます（例: server, domain）" />
        </div>

        <Field
          label="説明"
          name="description"
          defaultValue={category?.description ?? ""}
          as="textarea"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="アイコン" name="icon" defaultValue={category?.icon ?? ""} />
          <Field
            label="表示順"
            name="display_order"
            type="number"
            defaultValue={String(category?.display_order ?? 0)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SEOタイトル" name="seo_title" defaultValue={category?.seo_title ?? ""} />
          <Field
            label="SEOディスクリプション"
            name="seo_description"
            defaultValue={category?.seo_description ?? ""}
            as="textarea"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="is_published"
            defaultChecked={category?.is_published ?? false}
            className="h-4 w-4 rounded border-slate-300"
          />
          公開する
        </label>

        <div className="flex flex-wrap gap-3">
          <SubmitButton />
        </div>
      </form>

      {category ? (
        <form
          action={async (fd) => {
            if (!window.confirm("このカテゴリを削除しますか？")) return;
            fd.set("id", category.id);
            const result = await deleteCategoryAction(fd);
            setDeleteState(result);
          }}
        >
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-red-300 px-4 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            削除する
          </button>
        </form>
      ) : null}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue = "",
  required,
  type = "text",
  as,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
  as?: "textarea";
  hint?: string;
}) {
  const className =
    "w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2 " +
    (as === "textarea" ? "min-h-24 py-2" : "h-11");

  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {as === "textarea" ? (
        <textarea
          id={name}
          name={name}
          defaultValue={defaultValue}
          required={required}
          className={className}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue}
          required={required}
          className={className}
        />
      )}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

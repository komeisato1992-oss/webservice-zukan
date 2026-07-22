"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteComparisonFieldAction,
  saveComparisonFieldAction,
  type ActionResult,
} from "@/lib/actions/phase2";
import type { Category, ComparisonField, FieldType } from "@/lib/types/database";
import {
  DISPLAY_GROUP_PRESETS,
  FIELD_TYPE_LABELS,
  selectOptionsToText,
} from "@/lib/types/comparison";
import {
  FormMessage,
  SubmitButton,
  UnsavedGuard,
  useDirtyForm,
} from "@/components/admin/form-ui";

type Props = {
  categories: Category[];
  field?: ComparisonField | null;
};

export function ComparisonFieldForm({ categories, field }: Props) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await saveComparisonFieldAction(prev, formData);
      if (result.ok) {
        router.refresh();
        if (!field) {
          router.push("/admin/comparison-fields");
        }
      }
      return result;
    },
    null,
  );
  const [deleteState, setDeleteState] = useState<ActionResult | null>(null);
  const [fieldType, setFieldType] = useState<FieldType>(
    field?.field_type ?? "boolean",
  );
  const dirty = useDirtyForm();

  useEffect(() => {
    if (state?.ok) dirty.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="space-y-4">
      <FormMessage result={state} />
      <FormMessage result={deleteState} />
      <UnsavedGuard dirty={dirty.dirty} />

      <form
        action={formAction}
        onChange={dirty.onChange}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        {field ? <input type="hidden" name="id" value={field.id} /> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              項目名
            </label>
            <input
              name="name"
              required
              defaultValue={field?.name ?? ""}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
            />
            {state?.fieldErrors?.name ? (
              <p className="mt-1 text-xs text-red-600">
                {state.fieldErrors.name[0]}
              </p>
            ) : null}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              スラッグ
            </label>
            <input
              name="slug"
              required
              defaultValue={field?.slug ?? ""}
              placeholder="例: free-ssl"
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              カテゴリ内で一意（半角英数字とハイフン）
            </p>
            {state?.fieldErrors?.slug ? (
              <p className="mt-1 text-xs text-red-600">
                {state.fieldErrors.slug[0]}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              カテゴリ
            </label>
            <select
              name="category_id"
              required
              defaultValue={field?.category_id ?? categories[0]?.id ?? ""}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              入力形式
            </label>
            <select
              name="field_type"
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as FieldType)}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
            >
              {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((key) => (
                <option key={key} value={key}>
                  {FIELD_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              表示グループ
            </label>
            <input
              name="display_group"
              list="display-group-presets"
              defaultValue={field?.display_group ?? ""}
              placeholder="例: セキュリティ"
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
            />
            <datalist id="display-group-presets">
              {DISPLAY_GROUP_PRESETS.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              単位
            </label>
            <input
              name="unit"
              defaultValue={field?.unit ?? ""}
              placeholder="例: GB, 円, 日"
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            表示順
          </label>
          <input
            name="display_order"
            type="number"
            defaultValue={String(field?.display_order ?? 0)}
            className="h-11 w-full max-w-xs rounded-lg border border-slate-300 px-3 text-sm"
          />
        </div>

        {fieldType === "select" ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              選択肢（カンマ区切り）
            </label>
            <textarea
              name="select_options"
              defaultValue={selectOptionsToText(field?.select_options)}
              placeholder="例: NVMe SSD, SSD, HDD"
              className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {state?.fieldErrors?.select_options ? (
              <p className="mt-1 text-xs text-red-600">
                {state.fieldErrors.select_options[0]}
              </p>
            ) : null}
          </div>
        ) : (
          <input type="hidden" name="select_options" value="" />
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            説明
          </label>
          <textarea
            name="description"
            defaultValue={field?.description ?? ""}
            className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked={field?.is_published ?? true}
              className="h-4 w-4"
            />
            公開
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_filterable"
              defaultChecked={field?.is_filterable ?? false}
              className="h-4 w-4"
            />
            絞り込み対象
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_highlighted"
              defaultChecked={field?.is_highlighted ?? false}
              className="h-4 w-4"
            />
            強調表示
          </label>
        </div>

        <div className="sticky bottom-0 -mx-5 border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <SubmitButton />
        </div>
      </form>

      {field ? (
        <form
          action={async (fd) => {
            if (
              !window.confirm(
                "この比較項目を削除しますか？関連する値も削除されます。",
              )
            ) {
              return;
            }
            fd.set("id", field.id);
            const result = await deleteComparisonFieldAction(fd);
            setDeleteState(result);
            if (result.ok) {
              router.push("/admin/comparison-fields");
            }
          }}
        >
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-lg border border-red-300 px-4 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            削除する
          </button>
        </form>
      ) : null}
    </div>
  );
}

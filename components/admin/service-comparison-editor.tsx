"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveServiceComparisonValuesAction,
  type ActionResult,
} from "@/lib/actions/phase2";
import type {
  ComparisonField,
  ComparisonValue,
  ServicePlan,
} from "@/lib/types/database";
import {
  comparisonValueKey,
  groupFieldsByDisplayGroup,
  parseSelectOptions,
} from "@/lib/types/comparison";
import { FormMessage, SubmitButton } from "@/components/admin/form-ui";

type Props = {
  serviceId: string;
  categoryId: string;
  fields: ComparisonField[];
  values: ComparisonValue[];
  plans: ServicePlan[];
  draftOverrides?: Record<string, string>;
};

function FieldInput({
  field,
  name,
  current,
  draftValue,
}: {
  field: ComparisonField;
  name: string;
  current: ComparisonValue | undefined;
  draftValue?: string;
}) {
  if (field.field_type === "boolean") {
    const boolVal =
      draftValue === "true" || draftValue === "false"
        ? draftValue
        : current?.boolean_value == null
          ? "unset"
          : current.boolean_value
            ? "true"
            : "false";
    return (
      <select
        id={name}
        name={name}
        defaultValue={boolVal}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
      >
        <option value="unset">未確認</option>
        <option value="true">あり</option>
        <option value="false">なし</option>
      </select>
    );
  }

  if (field.field_type === "number" || field.field_type === "rating") {
    return (
      <input
        id={name}
        name={name}
        type="number"
        step="any"
        min={field.field_type === "rating" ? 0 : undefined}
        max={field.field_type === "rating" ? 10 : undefined}
        defaultValue={
          draftValue ??
          (current?.number_value != null ? String(current.number_value) : "")
        }
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
        placeholder={field.field_type === "rating" ? "0〜10" : "数値を入力"}
      />
    );
  }

  if (field.field_type === "text") {
    return (
      <input
        id={name}
        name={name}
        type="text"
        defaultValue={draftValue ?? current?.text_value ?? ""}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
      />
    );
  }

  if (field.field_type === "select") {
    const optionLabel = (opt: string) => {
      if (opt === "human") return "有人";
      if (opt === "chatbot") return "チャットボット";
      if (opt === "mixed") return "有人 / ボット";
      return opt;
    };
    return (
      <select
        id={name}
        name={name}
        defaultValue={draftValue ?? current?.text_value ?? ""}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
      >
        <option value="">未選択</option>
        {parseSelectOptions(field.select_options).map((opt) => (
          <option key={opt} value={opt}>
            {optionLabel(opt)}
          </option>
        ))}
      </select>
    );
  }

  return null;
}

function FieldRow({
  field,
  name,
  current,
  draftValue,
}: {
  field: ComparisonField;
  name: string;
  current: ComparisonValue | undefined;
  draftValue?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 sm:px-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={name} className="text-sm font-medium text-slate-800">
          {field.name}
          {field.unit ? (
            <span className="ml-1 font-normal text-slate-500">
              ({field.unit})
            </span>
          ) : null}
          {draftValue != null ? (
            <span className="ml-2 text-xs font-normal text-blue-700">
              取得候補反映済
            </span>
          ) : null}
        </label>
        <span className="text-xs text-slate-500">{field.field_type}</span>
      </div>
      <FieldInput
        field={field}
        name={name}
        current={current}
        draftValue={draftValue}
      />
    </div>
  );
}

export function ServiceComparisonEditor({
  serviceId,
  categoryId,
  fields,
  values,
  plans,
  draftOverrides = {},
}: Props) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await saveServiceComparisonValuesAction(prev, formData);
      if (result.ok) router.refresh();
      return result;
    },
    null,
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [openPlans, setOpenPlans] = useState<Record<string, boolean>>({});

  const valueMap = useMemo(() => {
    const map = new Map<string, ComparisonValue>();
    for (const v of values) {
      map.set(comparisonValueKey(v.comparison_field_id, v.plan_id), v);
    }
    return map;
  }, [values]);

  const groups = useMemo(() => groupFieldsByDisplayGroup(fields), [fields]);

  if (fields.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-600">
        このカテゴリの公開比較項目がありません。
        <br />
        管理画面の「比較項目」から追加してください。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FormMessage result={state} />
      <p className="text-sm text-slate-600">
        サービス単位の値を入力し、必要に応じてプラン単位も登録できます。一括保存されます。
        サポート情報（電話・メール・チャット）は「サポート」グループで、あり／なし／未確認を区別して編集できます。
      </p>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="service_id" value={serviceId} />
        <input type="hidden" name="category_id" value={categoryId} />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-slate-900">
            サービス単位
          </h3>
          <div className="mt-3 space-y-2">
            {groups.map(({ group, fields: groupFields }) => {
              const open = openGroups[group] ?? true;
              return (
                <div
                  key={group}
                  className="overflow-hidden rounded-xl border border-slate-200"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((prev) => ({
                        ...prev,
                        [group]: !open,
                      }))
                    }
                    className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-800"
                  >
                    <span>
                      {group}
                      <span className="ml-2 font-normal text-slate-500">
                        ({groupFields.length})
                      </span>
                    </span>
                    <span className="text-slate-400">{open ? "−" : "+"}</span>
                  </button>
                  {open ? (
                    <div className="space-y-2 p-3">
                      {groupFields.map((field) => (
                        <FieldRow
                          key={field.id}
                          field={field}
                          name={`svc_${field.id}`}
                          current={valueMap.get(
                            comparisonValueKey(field.id, null),
                          )}
                          draftValue={draftOverrides[field.id]}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {plans.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="text-base font-semibold text-slate-900">
              プラン単位（任意）
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              プランごとに値が異なる項目だけ入力してください。
            </p>
            <div className="mt-3 space-y-2">
              {plans.map((plan) => {
                const open = openPlans[plan.id] ?? false;
                return (
                  <div
                    key={plan.id}
                    className="overflow-hidden rounded-xl border border-slate-200"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenPlans((prev) => ({
                          ...prev,
                          [plan.id]: !open,
                        }))
                      }
                      className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-800"
                    >
                      <span>{plan.name}</span>
                      <span className="text-slate-400">{open ? "−" : "+"}</span>
                    </button>
                    {open ? (
                      <div className="space-y-3 p-3">
                        {groups.map(({ group, fields: groupFields }) => (
                          <div key={`${plan.id}-${group}`}>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {group}
                            </p>
                            <div className="space-y-2">
                              {groupFields.map((field) => (
                                <FieldRow
                                  key={`${plan.id}-${field.id}`}
                                  field={field}
                                  name={`plan_${plan.id}_${field.id}`}
                                  current={valueMap.get(
                                    comparisonValueKey(field.id, plan.id),
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            プランが未登録のため、プラン単位の入力は表示されません。
          </p>
        )}

        <div className="sticky bottom-0 z-10 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <SubmitButton label="比較項目を一括保存" />
        </div>
      </form>
    </div>
  );
}

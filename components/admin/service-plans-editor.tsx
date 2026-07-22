"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteServicePlanAction,
  reorderServicePlanAction,
  saveServicePlanAction,
  setDefaultComparisonPlanAction,
  type ActionResult,
} from "@/lib/actions/phase2";
import type { ServicePlan } from "@/lib/types/database";
import { FormMessage, SubmitButton } from "@/components/admin/form-ui";
import type { PlanDraftPatch } from "@/lib/scraping/diff";

type Props = {
  serviceId: string;
  serviceName?: string;
  plans: ServicePlan[];
  draftOverrides?: Record<string, PlanDraftPatch>;
  newPlanDraft?: PlanDraftPatch | null;
  initialEditingId?: string | "new" | null;
};

export function ServicePlansEditor({
  serviceId,
  serviceName,
  plans,
  draftOverrides = {},
  newPlanDraft = null,
  initialEditingId = null,
}: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(
    initialEditingId ?? (newPlanDraft ? "new" : null),
  );
  const [deleteMessage, setDeleteMessage] = useState<ActionResult | null>(null);
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await saveServicePlanAction(prev, formData);
      if (result.ok) {
        setEditingId(null);
        router.refresh();
      }
      return result;
    },
    null,
  );

  const editingPlan =
    editingId && editingId !== "new"
      ? plans.find((p) => p.id === editingId)
      : null;
  const draft =
    editingId === "new"
      ? (newPlanDraft ?? undefined)
      : editingPlan
        ? draftOverrides[editingPlan.id]
        : undefined;

  const message = deleteMessage ?? state;
  const sorted = [...plans].sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    return a.name.localeCompare(b.name, "ja");
  });

  return (
    <div className="space-y-4">
      <FormMessage result={message} />

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">
          {serviceName ? serviceName : "サービス"}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          配下のプランを追加・並び替え・代表設定できます
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{plans.length}件のプラン</p>
        <button
          type="button"
          onClick={() => {
            setDeleteMessage(null);
            setEditingId("new");
          }}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          プラン追加
        </button>
      </div>

      <ul className="space-y-2">
        {sorted.map((plan, index) => (
          <li
            key={plan.id}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-400">・</span>
                  <p className="font-medium text-slate-900">{plan.name}</p>
                  {plan.is_default_comparison_plan ? (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                      代表
                    </span>
                  ) : null}
                  {plan.is_recommended ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                      推奨
                    </span>
                  ) : null}
                  {!plan.is_published ? (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      非公開
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {plan.slug} / 表示順 {plan.display_order}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <form
                  action={async (fd) => {
                    fd.set("id", plan.id);
                    fd.set("service_id", serviceId);
                    fd.set("direction", "up");
                    const result = await reorderServicePlanAction(fd);
                    setDeleteMessage(result);
                    if (result.ok) router.refresh();
                  }}
                >
                  <button
                    type="submit"
                    disabled={index === 0}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
                  >
                    ↑
                  </button>
                </form>
                <form
                  action={async (fd) => {
                    fd.set("id", plan.id);
                    fd.set("service_id", serviceId);
                    fd.set("direction", "down");
                    const result = await reorderServicePlanAction(fd);
                    setDeleteMessage(result);
                    if (result.ok) router.refresh();
                  }}
                >
                  <button
                    type="submit"
                    disabled={index === sorted.length - 1}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
                  >
                    ↓
                  </button>
                </form>
                {!plan.is_default_comparison_plan ? (
                  <form
                    action={async (fd) => {
                      fd.set("id", plan.id);
                      fd.set("service_id", serviceId);
                      const result = await setDefaultComparisonPlanAction(fd);
                      setDeleteMessage(result);
                      if (result.ok) router.refresh();
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700"
                    >
                      代表にする
                    </button>
                  </form>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setDeleteMessage(null);
                    setEditingId(editingId === plan.id ? null : plan.id);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium"
                >
                  {editingId === plan.id ? "閉じる" : "編集"}
                </button>
                <form
                  action={async (fd) => {
                    if (!window.confirm("このプランを削除しますか？")) return;
                    fd.set("id", plan.id);
                    fd.set("service_id", serviceId);
                    const result = await deleteServicePlanAction(fd);
                    setDeleteMessage(result);
                    if (result.ok) router.refresh();
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700"
                  >
                    削除
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
        {plans.length === 0 ? (
          <li className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            プランがまだありません
          </li>
        ) : null}
      </ul>

      {editingId ? (
        <form
          action={formAction}
          className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/40 p-4 sm:p-5"
        >
          <input type="hidden" name="service_id" value={serviceId} />
          {editingPlan ? (
            <input type="hidden" name="id" value={editingPlan.id} />
          ) : null}
          <h3 className="font-semibold text-slate-900">
            {editingPlan ? "プラン編集" : "プラン追加"}
            {draft ? (
              <span className="ml-2 text-xs font-normal text-blue-700">
                取得候補反映済（未保存）
              </span>
            ) : null}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="プラン名"
              name="name"
              required
              defaultValue={draft?.name ?? editingPlan?.name ?? ""}
            />
            <Field
              label="スラッグ"
              name="slug"
              required
              defaultValue={draft?.slug ?? editingPlan?.slug ?? ""}
            />
            <Field
              label="通常月額"
              name="regular_monthly_price"
              type="number"
              defaultValue={
                draft?.regular_monthly_price ??
                num(editingPlan?.regular_monthly_price)
              }
            />
            <Field
              label="キャンペーン月額"
              name="campaign_monthly_price"
              type="number"
              defaultValue={
                draft?.campaign_monthly_price ??
                num(editingPlan?.campaign_monthly_price)
              }
            />
            <Field
              label="実質月額"
              name="effective_monthly_price"
              type="number"
              defaultValue={
                draft?.effective_monthly_price ??
                num(editingPlan?.effective_monthly_price)
              }
            />
            <Field
              label="初期費用"
              name="initial_fee"
              type="number"
              defaultValue={
                draft?.initial_fee ?? num(editingPlan?.initial_fee)
              }
            />
            <Field
              label="契約期間"
              name="billing_period"
              defaultValue={
                draft?.billing_period ?? editingPlan?.billing_period ?? ""
              }
              placeholder="例: 12ヶ月"
            />
            <Field
              label="表示順"
              name="display_order"
              type="number"
              defaultValue={String(editingPlan?.display_order ?? 0)}
            />
            <Field
              label="容量"
              name="storage_value"
              type="number"
              defaultValue={
                draft?.storage_value ?? num(editingPlan?.storage_value)
              }
            />
            <Field
              label="容量単位"
              name="storage_unit"
              defaultValue={
                draft?.storage_unit ?? editingPlan?.storage_unit ?? "GB"
              }
            />
            <Field
              label="プラン別公式URL"
              name="official_url"
              defaultValue={editingPlan?.official_url ?? ""}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              説明
            </label>
            <textarea
              name="description"
              defaultValue={editingPlan?.description ?? ""}
              className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="is_published"
                defaultChecked={editingPlan?.is_published ?? false}
                className="h-4 w-4"
              />
              公開する
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="is_default_comparison_plan"
                defaultChecked={
                  editingPlan?.is_default_comparison_plan ?? false
                }
                className="h-4 w-4"
              />
              比較表の代表プラン
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="is_recommended"
                defaultChecked={editingPlan?.is_recommended ?? false}
                className="h-4 w-4"
              />
              推奨プラン
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <SubmitButton label="プランを保存" />
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="h-11 rounded-lg border border-slate-300 px-4 text-sm"
            >
              キャンセル
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function num(v: number | null | undefined) {
  return v == null ? "" : String(v);
}

function Field({
  label,
  name,
  defaultValue = "",
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        name={name}
        type={type}
        step={type === "number" ? "any" : undefined}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
      />
    </div>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import {
  deleteServiceAction,
  saveServiceAction,
  type ActionResult,
} from "@/lib/actions/admin";
import type {
  AffiliateLink,
  Category,
  ComparisonField,
  ComparisonValue,
  Service,
  ServicePlan,
} from "@/lib/types/database";
import {
  FormMessage,
  SubmitButton,
  UnsavedGuard,
  useDirtyForm,
} from "@/components/admin/form-ui";
import { ServicePlansEditor } from "@/components/admin/service-plans-editor";
import { ServiceComparisonEditor } from "@/components/admin/service-comparison-editor";
import { ServiceOfficialScrapePanel } from "@/components/admin/service-official-scrape-panel";
import { ServicePresetPicker } from "@/components/admin/service-preset-picker";
import type { AppliedScrapeDraft } from "@/lib/scraping/diff";
import type { ServicePreset } from "@/lib/services/presets";
import {
  AFFILIATE_NETWORK_OPTIONS,
  AFFILIATE_STATUS_OPTIONS,
} from "@/lib/site/affiliate";

const TABS = [
  { id: "basic", label: "基本情報" },
  { id: "scrape", label: "公式情報取得" },
  { id: "plans", label: "プラン" },
  { id: "comparison", label: "比較項目" },
  { id: "links", label: "リンク・ASP" },
  { id: "images", label: "画像" },
  { id: "seo", label: "SEO" },
  { id: "publish", label: "公開設定" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Props = {
  categories: Category[];
  service?: Service | null;
  affiliate?: AffiliateLink | null;
  plans?: ServicePlan[];
  comparisonFields?: ComparisonField[];
  comparisonValues?: ComparisonValue[];
  savedFlash?: boolean;
  initialTab?: string;
  dictionaryId: string;
  dictionarySlug: string;
};

function resolveTab(tab: string | undefined): TabId {
  if (tab && TABS.some((t) => t.id === tab)) {
    return tab as TabId;
  }
  return "basic";
}

export function ServiceForm({
  categories,
  service,
  affiliate,
  plans = [],
  comparisonFields = [],
  comparisonValues = [],
  savedFlash,
  initialTab,
  dictionaryId,
  dictionarySlug,
}: Props) {
  const [tab, setTab] = useState<TabId>(() => resolveTab(initialTab));
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    saveServiceAction,
    savedFlash ? { ok: true, message: "サービスを保存しました。" } : null,
  );
  const dirty = useDirtyForm();
  const [scrapeDraft, setScrapeDraft] = useState<AppliedScrapeDraft>({
    plans: {},
    comparison: {},
    newPlan: null,
  });
  const [draftVersion, setDraftVersion] = useState(0);
  const [applyNotice, setApplyNotice] = useState<string | null>(null);
  const [presetNotice, setPresetNotice] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [nameValue, setNameValue] = useState(service?.name ?? "");
  const [seed, setSeed] = useState({
    name: service?.name ?? "",
    slug: service?.slug ?? "",
    short_name: service?.short_name ?? "",
    catchphrase: service?.catchphrase ?? "",
    about_text: service?.about_text ?? "",
    recommended_uses: service?.recommended_uses ?? "",
    official_url: service?.official_url ?? affiliate?.official_url ?? "",
    category_id: service?.category_id ?? categories[0]?.id ?? "",
    seo_title: service?.seo_title ?? "",
    seo_description: service?.seo_description ?? "",
  });
  const isNew = !service;
  const isMetaTab =
    tab === "plans" || tab === "comparison" || tab === "scrape";

  useEffect(() => {
    if (state?.ok) dirty.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when save succeeds
  }, [state]);

  function applyPreset(preset: ServicePreset) {
    const categoryId =
      categories.find((c) => c.slug === preset.categorySlug)?.id ??
      categories[0]?.id ??
      "";
    setNameValue(preset.name);
    setSeed({
      name: preset.name,
      slug: preset.slug,
      short_name: preset.shortName ?? "",
      catchphrase: preset.catchphrase ?? "",
      about_text: "",
      recommended_uses: preset.recommendedUses ?? "",
      official_url: preset.officialUrl,
      category_id: categoryId,
      seo_title: `${preset.name}の料金・機能比較｜サーバー図鑑`,
      seo_description: preset.summary,
    });
    setFormKey((k) => k + 1);
    dirty.markDirty();
    setPresetNotice(
      preset.scraperProviderId
        ? `「${preset.name}」の基本情報を入力しました。保存後すぐに公式情報取得へ進めます。`
        : `「${preset.name}」の基本情報を入力しました。このサービスはまだ公式情報取得に対応していません。プラン・比較項目は手動登録になります。`,
    );
    setTab("basic");
  }

  function handleApplyDraft(draft: AppliedScrapeDraft) {
    setScrapeDraft((prev) => ({
      plans: { ...prev.plans, ...draft.plans },
      comparison: { ...prev.comparison, ...draft.comparison },
      newPlan: draft.newPlan ?? prev.newPlan ?? null,
    }));
    setDraftVersion((v) => v + 1);
    dirty.markDirty();
    setApplyNotice(
      "取得候補をフォームへ反映しました。まだDBには保存されていません。",
    );

    if (draft.newPlan || Object.keys(draft.plans).length > 0) {
      setTab("plans");
    } else if (Object.keys(draft.comparison).length > 0) {
      setTab("comparison");
    }
  }

  return (
    <div className="space-y-4">
      <FormMessage result={state} />
      {applyNotice ? (
        <div
          role="status"
          className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
        >
          {applyNotice}
        </div>
      ) : null}
      {presetNotice ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {presetNotice}
        </div>
      ) : null}
      <UnsavedGuard dirty={dirty.dirty} />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm ${
              tab === item.id
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "scrape" ? (
        service ? (
          <ServiceOfficialScrapePanel
            serviceId={service.id}
            serviceSlug={service.slug}
            serviceName={service.name}
            officialUrl={service.official_url}
            onApplyDraft={handleApplyDraft}
          />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-600">
            公式情報取得はサービス保存後に利用できます。
            <br />
            候補から選んで基本情報を埋め、下の「保存して続行」を押してください。
          </p>
        )
      ) : null}

      {tab === "plans" ? (
        service ? (
          <ServicePlansEditor
            key={`plans-${draftVersion}`}
            serviceId={service.id}
            serviceName={service.name}
            plans={plans}
            draftOverrides={scrapeDraft.plans}
            newPlanDraft={scrapeDraft.newPlan}
            initialEditingId={
              Object.keys(scrapeDraft.plans)[0] ??
              (scrapeDraft.newPlan ? "new" : null)
            }
          />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-600">
            プランはサービス保存後に登録できます。
          </p>
        )
      ) : null}

      {tab === "comparison" ? (
        service ? (
          <ServiceComparisonEditor
            key={`comparison-${draftVersion}`}
            serviceId={service.id}
            categoryId={service.category_id}
            fields={comparisonFields}
            values={comparisonValues}
            plans={plans}
            draftOverrides={scrapeDraft.comparison}
          />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-600">
            比較項目の値はサービス保存後に登録できます。
          </p>
        )
      ) : null}

      <form
        key={formKey}
        action={formAction}
        onChange={dirty.onChange}
        className={`space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 ${
          isMetaTab ? "hidden" : ""
        }`}
      >
        {service ? <input type="hidden" name="id" value={service.id} /> : null}
        <input type="hidden" name="dictionary_id" value={dictionaryId} />
        <input type="hidden" name="dictionary_slug" value={dictionarySlug} />
        {affiliate ? (
          <input type="hidden" name="affiliate_id" value={affiliate.id} />
        ) : null}

        <section className={tab === "basic" ? "space-y-4" : "hidden"}>
          {isNew ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-slate-700">
              サービス名を入力するか、候補を選ぶと公式URL・slug・概要・カテゴリを自動入力します。保存後に公式情報取得へ進めます。
            </div>
          ) : null}

          {isNew ? (
            <ServicePresetPicker
              value={nameValue}
              onChange={setNameValue}
              onSelect={applyPreset}
            />
          ) : (
            <Field label="サービス名" name="name" defaultValue={seed.name} required />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="スラッグ" name="slug" defaultValue={seed.slug} required />
            <div>
              <label
                htmlFor="category_id"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                カテゴリ
              </label>
              <select
                id="category_id"
                name="category_id"
                required
                defaultValue={seed.category_id}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.slug})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Field
            label="公式サイトURL"
            name="official_url"
            type="url"
            defaultValue={seed.official_url}
            hint={
              isNew
                ? "候補選択で自動入力されます。公式情報取得の起点になります"
                : undefined
            }
          />
          <Field
            label="アフィリエイトURL"
            name="affiliate_url"
            type="url"
            defaultValue={service?.affiliate_url ?? affiliate?.affiliate_url ?? ""}
            hint="入力されている場合、本サイトの公式サイトボタンにはアフィリエイトURLが優先して使用されます。"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="affiliate_network"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                ASP
              </label>
              <select
                id="affiliate_network"
                name="affiliate_network"
                defaultValue={service?.affiliate_network ?? "A8"}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              >
                {AFFILIATE_NETWORK_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="affiliate_status"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                提携状況
              </label>
              <select
                id="affiliate_status"
                name="affiliate_status"
                defaultValue={service?.affiliate_status ?? "inactive"}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              >
                {AFFILIATE_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Field
            label="短い名称"
            name="short_name"
            defaultValue={seed.short_name}
          />
          <Field
            label="キャッチコピー"
            name="catchphrase"
            defaultValue={seed.catchphrase}
          />
          <Field
            label="〇〇とは（説明文）"
            name="about_text"
            defaultValue={seed.about_text}
            as="textarea"
            hint="サービス詳細ページの「サービス名とは」セクションに表示されます"
          />
          <Field
            label="おすすめ用途"
            name="recommended_uses"
            defaultValue={seed.recommended_uses}
            as="textarea"
            hint="例: ブログ、コーポレートサイト、EC"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="編集部スコア (0-10)"
              name="editor_score"
              type="number"
              defaultValue={
                service?.editor_score != null ? String(service.editor_score) : ""
              }
            />
            <Field
              label="表示順"
              name="display_order"
              type="number"
              defaultValue={String(service?.display_order ?? 0)}
            />
          </div>
        </section>

        <section className={tab === "links" ? "space-y-4" : "hidden"}>
          <p className="text-sm text-slate-600">
            公式サイトURL・アフィリエイトURL・ASP・提携状況は基本情報タブで設定します。こちらはレガシーの affiliate_links 詳細用です。
          </p>
          <Field label="ASP名" name="asp_name" defaultValue={affiliate?.asp_name ?? ""} />
          <Field
            label="プログラム名"
            name="program_name"
            defaultValue={affiliate?.program_name ?? ""}
          />
          <div>
            <label
              htmlFor="approval_status"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              承認状態
            </label>
            <select
              id="approval_status"
              name="approval_status"
              defaultValue={affiliate?.approval_status ?? "not_applied"}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
            >
              <option value="not_applied">未申請</option>
              <option value="pending">申請中</option>
              <option value="approved">承認済</option>
              <option value="rejected">却下</option>
              <option value="closed">終了</option>
            </select>
          </div>
          <Field
            label="報酬メモ"
            name="reward_note"
            defaultValue={affiliate?.reward_note ?? ""}
            as="textarea"
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="affiliate_is_active"
              defaultChecked={affiliate?.is_active ?? true}
              className="h-4 w-4 rounded border-slate-300"
            />
            アフィリエイトリンクを有効にする
          </label>
        </section>

        <section className={tab === "images" ? "space-y-4" : "hidden"}>
          <Field label="ロゴURL" name="logo_url" defaultValue={service?.logo_url ?? ""} />
          <Field
            label="サムネイルURL"
            name="thumbnail_url"
            defaultValue={service?.thumbnail_url ?? ""}
          />
          <p className="text-xs text-slate-500">
            Phase 1 ではURL入力のみ対応。ファイルアップロードは後日対応予定です。
          </p>
        </section>

        <section className={tab === "seo" ? "space-y-4" : "hidden"}>
          <Field label="SEOタイトル" name="seo_title" defaultValue={seed.seo_title} />
          <Field
            label="meta description"
            name="seo_description"
            defaultValue={seed.seo_description}
            as="textarea"
          />
          <Field
            label="canonical URL"
            name="canonical_url"
            defaultValue={service?.canonical_url ?? ""}
          />
          <Field
            label="OGP画像URL"
            name="og_image_url"
            defaultValue={service?.og_image_url ?? ""}
          />
        </section>

        <section className={tab === "publish" ? "space-y-4" : "hidden"}>
          <div>
            <label
              htmlFor="status"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              公開状態
            </label>
            <select
              id="status"
              name="status"
              defaultValue={service?.status ?? "draft"}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
            >
              <option value="draft">下書き</option>
              <option value="published">公開</option>
              <option value="unpublished">非公開</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="is_featured"
              defaultChecked={service?.is_featured ?? false}
              className="h-4 w-4 rounded border-slate-300"
            />
            おすすめに表示する
          </label>
        </section>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <SubmitButton
            label={isNew ? "保存して続行" : "保存する"}
            pendingLabel={isNew ? "保存中…" : "保存中…"}
          />
          {isNew ? (
            <p className="text-xs text-slate-500">
              保存後、編集画面の「公式情報取得」タブへ進めます
            </p>
          ) : null}
          {service ? (
            <p className="text-xs text-slate-500">
              更新日時: {new Date(service.updated_at).toLocaleString("ja-JP")}
            </p>
          ) : null}
        </div>
      </form>

      {service ? (
        <form
          action={async () => {
            if (!window.confirm("このサービスを削除しますか？")) return;
            const fd = new FormData();
            fd.set("id", service.id);
            await deleteServiceAction(fd);
          }}
        >
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-red-300 px-4 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            サービスを削除
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
    (as === "textarea" ? "min-h-28 py-2" : "h-11");

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
          step={type === "number" ? "any" : undefined}
          defaultValue={defaultValue}
          required={required}
          className={className}
        />
      )}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

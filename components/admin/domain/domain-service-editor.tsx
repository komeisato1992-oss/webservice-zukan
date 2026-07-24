"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveDomainServiceAction } from "@/lib/actions/domain";
import type { ActionResult } from "@/lib/actions/admin";
import {
  FormMessage,
  SubmitButton,
  UnsavedGuard,
  useDirtyForm,
} from "@/components/admin/form-ui";
import {
  AFFILIATE_NETWORK_OPTIONS,
} from "@/lib/site/affiliate";
import type {
  DomainFaqItem,
  DomainServiceDetails,
  Service,
} from "@/lib/types/database";

const TABS = [
  { id: "basic", label: "基本" },
  { id: "pricing", label: "料金" },
  { id: "features", label: "機能・サポート" },
  { id: "campaign", label: "キャンペーン" },
  { id: "seo", label: "SEO" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Props = {
  service: Service;
  details: DomainServiceDetails | null;
};

const FEATURE_FIELDS: { key: keyof DomainServiceDetails; label: string }[] = [
  { key: "whois_privacy_status", label: "Whois代理公開" },
  { key: "dns_status", label: "DNS設定" },
  { key: "dnssec_status", label: "DNSSEC" },
  { key: "auto_renewal_status", label: "自動更新" },
  { key: "transfer_status", label: "ドメイン移管" },
  { key: "japanese_domain_status", label: "日本語ドメイン" },
  { key: "phone_support_status", label: "電話サポート" },
  { key: "email_support_status", label: "メールサポート" },
  { key: "chat_support_status", label: "チャットサポート" },
  { key: "server_bundle_benefit", label: "サーバー同時契約特典" },
  { key: "free_domain_benefit", label: "無料ドメイン特典" },
];

const TLD_ROWS = [
  { prefix: "com", label: ".com" },
  { prefix: "jp", label: ".jp" },
  { prefix: "co_jp", label: ".co.jp" },
  { prefix: "net", label: ".net" },
] as const;

function priceValue(
  details: DomainServiceDetails | null,
  key: keyof DomainServiceDetails,
): string {
  const v = details?.[key];
  if (v === null || v === undefined) return "";
  return String(v);
}

function statusValue(
  details: DomainServiceDetails | null,
  key: keyof DomainServiceDetails,
): string {
  const v = details?.[key];
  if (v === "supported" || v === "unsupported") return v;
  return "";
}

export function DomainServiceEditor({ service, details }: Props) {
  const [tab, setTab] = useState<TabId>("basic");
  const [faq, setFaq] = useState<DomainFaqItem[]>(() =>
    Array.isArray(details?.faq) && details.faq.length > 0
      ? details.faq
      : [{ question: "", answer: "" }],
  );
  const dirty = useDirtyForm();
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await saveDomainServiceAction(prev, formData);
      if (result.ok) dirty.resetDirty();
      return result;
    },
    null,
  );

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/domain/services"
            className="text-sm text-blue-700 hover:underline"
          >
            ← サービス一覧
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {service.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600">ドメイン図鑑・編集</p>
        </div>
      </div>

      <FormMessage result={state} />
      <UnsavedGuard dirty={dirty.dirty} />

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`shrink-0 rounded-lg px-3 py-2.5 text-sm ${
              tab === item.id
                ? "bg-blue-50 font-medium text-blue-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form action={formAction} onChange={dirty.onChange} className="space-y-4">
        <input type="hidden" name="service_id" value={service.id} />

        <section
          className={`space-y-4 rounded-2xl border border-slate-200 bg-white p-5 ${
            tab === "basic" ? "" : "hidden"
          }`}
        >
          <TextField label="サービス名" name="name" defaultValue={service.name} required />
          <TextField label="slug" name="slug" defaultValue={service.slug} required />
          <TextField
            label="運営会社名"
            name="company_name"
            defaultValue={service.company_name ?? ""}
          />
          <TextField
            label="公式サイトURL"
            name="official_url"
            type="url"
            defaultValue={service.official_url ?? ""}
          />
          <TextField
            label="アフィリエイトURL"
            name="affiliate_url"
            type="url"
            defaultValue={service.affiliate_url ?? ""}
            hint="入力されている場合、本サイトの公式サイトボタンにはアフィリエイトURLが優先して使用されます。"
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              ASP
            </span>
            <select
              name="affiliate_network"
              defaultValue={service.affiliate_network ?? ""}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
            >
              <option value="">未設定</option>
              {AFFILIATE_NETWORK_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <TextField
            label="ロゴURL"
            name="logo_url"
            defaultValue={service.logo_url ?? ""}
            hint="空のまま保存しても既存のロゴは保持されます。"
          />
          {service.logo_url ? (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="clear_logo"
                className="h-4 w-4 rounded border-slate-300"
              />
              ロゴを削除する（チェック時のみ既存ロゴを消去）
            </label>
          ) : null}
          <TextField
            label="キャッチコピー"
            name="catchphrase"
            defaultValue={service.catchphrase ?? ""}
          />
          <TextArea
            label="サービス概要"
            name="about_text"
            defaultValue={service.about_text ?? ""}
          />
          <TextArea
            label="メリット"
            name="merits"
            defaultValue={details?.merits ?? ""}
          />
          <TextArea
            label="デメリット"
            name="demerits"
            defaultValue={details?.demerits ?? ""}
          />
          <TextArea
            label="おすすめな人"
            name="recommended_uses"
            defaultValue={service.recommended_uses ?? ""}
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              公開状態
            </span>
            <select
              name="status"
              defaultValue={service.status}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
            >
              <option value="draft">下書き</option>
              <option value="published">公開</option>
              <option value="unpublished">非公開</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="is_site_visible"
              value="true"
              defaultChecked={service.is_site_visible !== false}
              className="h-4 w-4 rounded border-slate-300"
            />
            本サイトに表示する
          </label>
          <TextField
            label="表示順"
            name="display_order"
            type="number"
            defaultValue={String(service.display_order ?? 0)}
          />
        </section>

        <section
          className={`space-y-5 rounded-2xl border border-slate-200 bg-white p-5 ${
            tab === "pricing" ? "" : "hidden"
          }`}
        >
          <p className="text-sm text-slate-600">
            空欄は「未確認」、0 は「0円」として保存されます。
          </p>
          {TLD_ROWS.map((tld) => (
            <div key={tld.prefix} className="rounded-xl border border-slate-100 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                {tld.label}
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <PriceField
                  label="取得料金"
                  name={`${tld.prefix}_registration_price`}
                  defaultValue={priceValue(
                    details,
                    `${tld.prefix}_registration_price` as keyof DomainServiceDetails,
                  )}
                />
                <PriceField
                  label="更新料金"
                  name={`${tld.prefix}_renewal_price`}
                  defaultValue={priceValue(
                    details,
                    `${tld.prefix}_renewal_price` as keyof DomainServiceDetails,
                  )}
                />
                <PriceField
                  label="移管料金"
                  name={`${tld.prefix}_transfer_price`}
                  defaultValue={priceValue(
                    details,
                    `${tld.prefix}_transfer_price` as keyof DomainServiceDetails,
                  )}
                />
              </div>
            </div>
          ))}
          <PriceField
            label="初期費用"
            name="initial_fee"
            defaultValue={priceValue(details, "initial_fee")}
          />
          <TextArea
            label="キャンペーン価格の補足"
            name="campaign_price_note"
            defaultValue={details?.campaign_price_note ?? ""}
          />
          <TextArea
            label="料金に関する備考"
            name="price_note"
            defaultValue={details?.price_note ?? ""}
          />
        </section>

        <section
          className={`space-y-4 rounded-2xl border border-slate-200 bg-white p-5 ${
            tab === "features" ? "" : "hidden"
          }`}
        >
          <p className="text-sm text-slate-600">
            対応 / 非対応 / 未確認 の3状態です。
          </p>
          {FEATURE_FIELDS.map((field) => (
            <StatusField
              key={field.key}
              label={field.label}
              name={field.key}
              defaultValue={statusValue(details, field.key)}
            />
          ))}
          <PriceField
            label="Whois代理公開料金"
            name="whois_privacy_price"
            defaultValue={priceValue(details, "whois_privacy_price")}
          />
          <TextArea
            label="機能・サポート補足"
            name="feature_note"
            defaultValue={details?.feature_note ?? ""}
          />
        </section>

        <section
          className={`space-y-4 rounded-2xl border border-slate-200 bg-white p-5 ${
            tab === "campaign" ? "" : "hidden"
          }`}
        >
          <TextField
            label="キャンペーン名"
            name="campaign_name"
            defaultValue={details?.campaign_name ?? ""}
          />
          <TextArea
            label="キャンペーン内容"
            name="campaign_description"
            defaultValue={details?.campaign_description ?? ""}
          />
          <TextField
            label="終了日"
            name="campaign_end_date"
            type="date"
            defaultValue={details?.campaign_end_date ?? ""}
          />
          <TextField
            label="キャンペーンURL"
            name="campaign_url"
            defaultValue={details?.campaign_url ?? ""}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="campaign_is_active"
              value="true"
              defaultChecked={details?.campaign_is_active === true}
              className="h-4 w-4 rounded border-slate-300"
            />
            有効
          </label>
        </section>

        <section
          className={`space-y-4 rounded-2xl border border-slate-200 bg-white p-5 ${
            tab === "seo" ? "" : "hidden"
          }`}
        >
          <TextField
            label="SEOタイトル"
            name="seo_title"
            defaultValue={service.seo_title ?? ""}
          />
          <TextArea
            label="meta description"
            name="seo_description"
            defaultValue={service.seo_description ?? ""}
          />
          <TextField
            label="canonical URL"
            name="canonical_url"
            defaultValue={service.canonical_url ?? ""}
          />
          <TextField
            label="OGP画像URL"
            name="og_image_url"
            defaultValue={service.og_image_url ?? ""}
          />
          <TextArea
            label="本文上部説明"
            name="intro_text"
            defaultValue={details?.intro_text ?? ""}
          />
          <TextArea
            label="本文下部説明"
            name="outro_text"
            defaultValue={details?.outro_text ?? ""}
          />
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">FAQ</h3>
              <button
                type="button"
                onClick={() => {
                  setFaq((prev) => [...prev, { question: "", answer: "" }]);
                  dirty.markDirty();
                }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                ＋追加
              </button>
            </div>
            {faq.map((item, index) => (
              <div
                key={index}
                className="space-y-2 rounded-xl border border-slate-100 p-3"
              >
                <input
                  name="faq_question"
                  defaultValue={item.question}
                  placeholder="質問"
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
                <textarea
                  name="faq_answer"
                  defaultValue={item.answer}
                  placeholder="回答"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <div className="mx-auto max-w-6xl">
            <SubmitButton />
          </div>
        </div>
      </form>
    </div>
  );
}

function TextField({
  label,
  name,
  defaultValue,
  required,
  type = "text",
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
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
        defaultValue={defaultValue}
        inputMode={type === "url" ? "url" : undefined}
        className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
      />
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={4}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
      />
    </label>
  );
}

function PriceField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        name={name}
        type="number"
        step="1"
        min="0"
        inputMode="decimal"
        placeholder="未確認は空欄"
        defaultValue={defaultValue}
        className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
      />
    </label>
  );
}

function StatusField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
      >
        <option value="">未確認</option>
        <option value="supported">対応</option>
        <option value="unsupported">非対応</option>
      </select>
    </label>
  );
}

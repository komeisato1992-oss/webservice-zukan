"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  discardServiceDraftAction,
  publishServiceDraftAction,
  saveServiceDraftAction,
} from "@/lib/actions/cms";
import {
  AFFECTED_PAGE_LABELS,
  CMS_SECTIONS,
  type CmsSectionId,
  type CmsServiceDraft,
  type ScrapingCandidate,
  type ServiceDraftPayload,
} from "@/lib/cms/types";
import type {
  Category,
  ComparisonField,
  Service,
} from "@/lib/types/database";
import { UnsavedGuard } from "@/components/admin/form-ui";
import { TriStateControl } from "@/components/admin/cms/tri-state-control";
import { MobileActionBar } from "@/components/admin/cms/mobile-action-bar";
import { SectionAccordion } from "@/components/admin/cms/section-accordion";
import { StatusBadge, type CmsBadgeStatus } from "@/components/admin/cms/status-badge";
import { ScrapingCandidatesPanel } from "@/components/admin/cms/scraping-candidates-panel";
import { CLEAR_LOGO_URL_KEY } from "@/lib/admin/logo-url";
import {
  createDraftPlan,
  duplicateDraftPlan,
  removeOrUnpublishPlan,
} from "@/lib/cms/plans";
import { formatPlanLabel } from "@/lib/site/service-name-display";
import { planMonthlyPrice } from "@/lib/site/plan-utils";
import {
  AFFILIATE_NETWORK_OPTIONS,
  AFFILIATE_STATUS_OPTIONS,
} from "@/lib/site/affiliate";
import type { ServicePlan } from "@/lib/types/database";

type Props = {
  categories: Category[];
  service: Service;
  draft: CmsServiceDraft;
  comparisonFields: ComparisonField[];
  candidates: ScrapingCandidate[];
  dictionarySlug: string;
};

type Row = Record<string, unknown>;

type BoolPatch = Partial<{
  boolean_value: boolean | null;
  number_value: number | null;
  text_value: string | null;
}>;

const WORDPRESS_SLUGS = [
  "wp-easy-install",
  "wp-easy-migrate",
  "wp-auto-update",
  "wp-staging",
  "wp-free-theme",
  "wp-setup-support",
];

const PERFORMANCE_SLUGS = [
  "storage-type",
  "nvme-ssd",
  "litespeed",
  "http3",
  "http2",
  "cdn",
  "cpu",
  "memory",
  "transfer",
];

const SUPPORT_SLUGS = [
  "support-phone",
  "support-email",
  "support-chat",
  "support-24h",
  "support-weekend",
  "support-hours",
  "support-notes",
];

const SECURITY_SLUGS = [
  "free-ssl",
  "waf",
  "ddos",
  "antivirus",
  "anti-spam",
  "auto-backup",
  "backup-retention-days",
];

const SKIP_SERVICE_KEYS = new Set([
  "updated_at",
  "created_at",
  "data_version",
  "has_unpublished_changes",
  "draft_updated_at",
]);

function clonePayload(payload: ServiceDraftPayload): ServiceDraftPayload {
  return structuredClone(payload);
}

function fieldsBySlug(fields: ComparisonField[], slugs: string[]): ComparisonField[] {
  const map = new Map(fields.map((f) => [f.slug, f]));
  return slugs
    .map((slug) => map.get(slug))
    .filter((f): f is ComparisonField => Boolean(f));
}

function getComparisonRow(values: Row[], fieldId: string, planId: string | null): Row | undefined {
  return values.find(
    (v) => String(v.comparison_field_id) === fieldId && ((v.plan_id as string | null) ?? null) === planId,
  );
}

function upsertComparisonRow(values: Row[], fieldId: string, planId: string | null, patch: BoolPatch): Row[] {
  const idx = values.findIndex(
    (v) => String(v.comparison_field_id) === fieldId && ((v.plan_id as string | null) ?? null) === planId,
  );
  if (idx >= 0) {
    const next = [...values];
    next[idx] = { ...next[idx], ...patch };
    return next;
  }
  return [
    ...values,
    {
      id: crypto.randomUUID(),
      plan_id: planId,
      comparison_field_id: fieldId,
      boolean_value: null,
      number_value: null,
      text_value: null,
      ...patch,
    },
  ];
}

function hasRowValue(row: Row | undefined): boolean {
  if (!row) return false;
  return (
    row.boolean_value != null ||
    row.number_value != null ||
    (typeof row.text_value === "string" && row.text_value.trim() !== "")
  );
}

function groupStats(fields: ComparisonField[], values: Row[], published: Row[] | undefined) {
  let filled = 0;
  let changes = 0;
  let pending = 0;
  for (const field of fields) {
    const cur = getComparisonRow(values, field.id, null);
    const pub = published ? getComparisonRow(published, field.id, null) : undefined;
    if (hasRowValue(cur)) filled += 1;
    if (field.field_type === "boolean" && ((cur?.boolean_value as boolean | null) ?? null) == null) {
      pending += 1;
    }
    if (JSON.stringify(cur ?? null) !== JSON.stringify(pub ?? null)) changes += 1;
  }
  return { filled, total: fields.length, changes, pending };
}

function safeExternalHref(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function formatDiffValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** サービス編集のメインCMSエディタ。モバイルはタブ+アコーディオン、デスクトップは左ナビ+本文。 */
export function ServiceCmsEditor({
  categories,
  service,
  draft,
  comparisonFields,
  candidates,
  dictionarySlug,
}: Props) {
  const router = useRouter();
  const [payload, setPayload] = useState<ServiceDraftPayload>(() => clonePayload(draft.payload));
  const [dirty, setDirty] = useState(false);
  const [activeSection, setActiveSection] = useState<CmsSectionId>("basic");
  const [saving, startSaving] = useTransition();
  const [publishing, startPublishing] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const serviceRow = payload.service as Row;
  const publishedSnapshot = draft.published_snapshot;

  const ownCandidates = useMemo(
    () => candidates.filter((c) => c.service_id === service.id),
    [candidates, service.id],
  );

  function mutate(fn: (next: ServiceDraftPayload) => ServiceDraftPayload) {
    setPayload((prev) => fn(clonePayload(prev)));
    setDirty(true);
  }

  function setServiceField(key: string, value: unknown) {
    mutate((p) => {
      p.service = { ...p.service, [key]: value };
      return p;
    });
  }

  function setComparisonField(fieldId: string, planId: string | null, patch: BoolPatch) {
    mutate((p) => {
      p.comparison_values = upsertComparisonRow(p.comparison_values, fieldId, planId, patch);
      return p;
    });
  }

  function updatePlan(planId: string, patch: Row) {
    mutate((p) => {
      p.plans = p.plans.map((plan) =>
        String(plan.id) === planId
          ? {
              ...plan,
              ...patch,
              has_unpublished_changes: true,
              publish_status:
                patch.is_published === true
                  ? "published"
                  : patch.is_published === false
                    ? "draft"
                    : plan.publish_status === "published"
                      ? "pending_review"
                      : (plan.publish_status ?? "draft"),
            }
          : plan,
      );
      return p;
    });
  }

  function addPlan(seed?: Row) {
    let newId = "";
    mutate((p) => {
      const taken = new Set(
        p.plans
          .map((plan) => (typeof plan.slug === "string" ? plan.slug : ""))
          .filter(Boolean),
      );
      const serviceSlug =
        typeof p.service.slug === "string" ? p.service.slug : service.slug;
      const plan = createDraftPlan(service.id, {
        name: typeof seed?.name === "string" ? seed.name : "新しいプラン",
        displayOrder: p.plans.length,
        serviceSlug,
        takenSlugs: taken,
        seed,
      });
      newId = String(plan.id);
      p.plans = [...p.plans, plan];
      return p;
    });
    if (newId) setExpandedPlanId(newId);
    setActiveSection("plans");
  }

  function duplicatePlan(planId: string) {
    let newId = "";
    mutate((p) => {
      const source = p.plans.find((plan) => String(plan.id) === planId);
      if (!source) return p;
      const taken = new Set(
        p.plans
          .map((plan) => (typeof plan.slug === "string" ? plan.slug : ""))
          .filter(Boolean),
      );
      const serviceSlug =
        typeof p.service.slug === "string" ? p.service.slug : service.slug;
      const copy = duplicateDraftPlan(source, p.plans.length, {
        serviceSlug,
        takenSlugs: taken,
      });
      newId = String(copy.id);
      p.plans = [...p.plans, copy];
      return p;
    });
    if (newId) setExpandedPlanId(newId);
  }

  function softDeletePlan(planId: string) {
    if (!window.confirm("このプランを非公開／削除予定にしますか？（下書き保存後、公開まで本番には残ります）")) {
      return;
    }
    const publishedIds = new Set(
      (publishedSnapshot?.plans ?? []).map((p) => String(p.id)),
    );
    mutate((p) => removeOrUnpublishPlan(p, planId, publishedIds));
    setExpandedPlanId((cur) => (cur === planId ? null : cur));
  }

  function setRepresentativePlan(planId: string) {
    mutate((p) => {
      p.plans = p.plans.map((plan) => ({
        ...plan,
        is_default_comparison_plan: String(plan.id) === planId,
        has_unpublished_changes: true,
      }));
      return p;
    });
  }

  function addCampaign() {
    mutate((p) => {
      p.campaigns = [
        ...p.campaigns,
        {
          id: crypto.randomUUID(),
          service_id: service.id,
          name: "新しいキャンペーン",
          summary: "",
          target_plan_ids: [],
          discount_rate: null,
          discount_amount: null,
          coupon_code: "",
          cashback_note: "",
          first_month_free: false,
          ends_on: null,
          source_url: "",
          publish_status: "draft",
          is_published: false,
          has_unpublished_changes: true,
          display_order: p.campaigns.length,
        },
      ];
      return p;
    });
  }

  function updateCampaign(id: string, patch: Row) {
    mutate((p) => {
      p.campaigns = p.campaigns.map((c) => (String(c.id) === id ? { ...c, ...patch } : c));
      return p;
    });
  }

  function removeCampaign(id: string) {
    if (!window.confirm("このキャンペーンを削除しますか？")) return;
    mutate((p) => {
      p.campaigns = p.campaigns.filter((c) => String(c.id) !== id);
      return p;
    });
  }

  function setSeoField(key: string, value: unknown) {
    mutate((p) => {
      p.seo = { ...(p.seo ?? {}), [key]: value };
      return p;
    });
  }

  function saveDraft() {
    startSaving(async () => {
      const result = await saveServiceDraftAction(service.id, payload, "admin");
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) {
        setDirty(false);
        router.refresh();
      }
    });
  }

  function discardDraft() {
    if (!window.confirm("編集中の内容を破棄して公開中の内容に戻しますか？")) return;
    startSaving(async () => {
      const result = await discardServiceDraftAction(service.id);
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) {
        setPayload(clonePayload(publishedSnapshot ?? draft.payload));
        setDirty(false);
        router.refresh();
      }
    });
  }

  function confirmPublish() {
    startPublishing(async () => {
      const result = await publishServiceDraftAction(service.id, { publishFullDraft: true });
      setMessage({ ok: result.ok, text: result.message });
      setShowPublishConfirm(false);
      if (result.ok) {
        setDirty(false);
        router.refresh();
      }
    });
  }

  const unpublishedCount = draft.change_count;
  const statusLabel: CmsBadgeStatus = dirty ? "unsaved" : draft.status;

  const plansChangedCount = useMemo(() => {
    const pubPlans = publishedSnapshot?.plans ?? [];
    return payload.plans.filter((plan) => {
      const pub = pubPlans.find((p) => String(p.id) === String(plan.id));
      return JSON.stringify(plan) !== JSON.stringify(pub ?? null);
    }).length;
  }, [payload.plans, publishedSnapshot]);

  return (
    <div className="pb-28 lg:pb-8">
      <UnsavedGuard dirty={dirty} />

      <div className="sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/${dictionarySlug}/services`}
            className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600"
          >
            ← 一覧
          </Link>
          <p className="min-w-0 flex-1 truncate font-semibold text-slate-900">{service.name}</p>
          <StatusBadge status={statusLabel} />
          {unpublishedCount > 0 ? (
            <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
              未公開 {unpublishedCount}
            </span>
          ) : null}
        </div>

        <div className="scroll-row mt-3 flex gap-1.5 overflow-x-auto lg:hidden">
          {CMS_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                activeSection === section.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {message ? (
        <div
          role="status"
          className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
            message.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="mt-4 gap-6 lg:mt-6 lg:flex">
        <nav className="hidden w-48 shrink-0 flex-col gap-1 lg:flex">
          {CMS_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`rounded-lg px-3 py-2.5 text-left text-sm font-medium ${
                activeSection === section.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 space-y-4">
          {activeSection === "basic" ? (
            <BasicSection
              categories={categories}
              serviceRow={serviceRow}
              onChange={setServiceField}
            />
          ) : null}

          {activeSection === "plans" ? (
            <PlansSection
              plans={payload.plans}
              publishedPlans={publishedSnapshot?.plans}
              expandedId={expandedPlanId}
              onExpand={setExpandedPlanId}
              onChange={updatePlan}
              onAdd={() => addPlan()}
              onDuplicate={duplicatePlan}
              onSoftDelete={softDeletePlan}
              onSetRepresentative={setRepresentativePlan}
              onSaveDraft={saveDraft}
              onShowDiff={() => setShowDiff(true)}
              onPublish={() => setShowPublishConfirm(true)}
              saving={saving}
            />
          ) : null}

          {activeSection === "wordpress" ? (
            <ComparisonSection
              sectionId="wordpress"
              title="WordPress"
              fields={fieldsBySlug(comparisonFields, WORDPRESS_SLUGS)}
              values={payload.comparison_values}
              published={publishedSnapshot?.comparison_values}
              onChange={setComparisonField}
            />
          ) : null}

          {activeSection === "performance" ? (
            <ComparisonSection
              sectionId="performance"
              title="性能"
              fields={fieldsBySlug(comparisonFields, PERFORMANCE_SLUGS)}
              values={payload.comparison_values}
              published={publishedSnapshot?.comparison_values}
              onChange={setComparisonField}
            />
          ) : null}

          {activeSection === "support" ? (
            <ComparisonSection
              sectionId="support"
              title="サポート"
              fields={fieldsBySlug(comparisonFields, SUPPORT_SLUGS)}
              values={payload.comparison_values}
              published={publishedSnapshot?.comparison_values}
              onChange={setComparisonField}
            />
          ) : null}

          {activeSection === "security" ? (
            <ComparisonSection
              sectionId="security"
              title="セキュリティ"
              fields={fieldsBySlug(comparisonFields, SECURITY_SLUGS)}
              values={payload.comparison_values}
              published={publishedSnapshot?.comparison_values}
              onChange={setComparisonField}
            />
          ) : null}

          {activeSection === "campaigns" ? (
            <CampaignsSection
              campaigns={payload.campaigns}
              onAdd={addCampaign}
              onUpdate={updateCampaign}
              onRemove={removeCampaign}
            />
          ) : null}

          {activeSection === "seo" ? (
            <SeoSection seo={payload.seo ?? {}} onChange={setSeoField} />
          ) : null}

          {activeSection === "scrape" ? (
            <SectionAccordion
              id="scrape"
              title="取得候補"
              total={ownCandidates.length}
              filled={ownCandidates.filter((c) => c.status !== "pending").length}
              pending={ownCandidates.filter((c) => c.status === "pending").length}
              defaultOpen
            >
              <ScrapingCandidatesPanel candidates={ownCandidates} embedded />
            </SectionAccordion>
          ) : null}
        </div>
      </div>

      <div className="mt-6 hidden lg:block">
        <button
          type="button"
          onClick={discardDraft}
          disabled={saving}
          className="h-10 rounded-lg border border-red-300 px-4 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          変更を破棄して公開中に戻す
        </button>
      </div>

      <MobileActionBar
        onSaveDraft={saveDraft}
        onDiff={() => setShowDiff(true)}
        onPublish={() => setShowPublishConfirm(true)}
        saving={saving || publishing}
        dirtyCount={dirty ? 1 : 0}
        unpublishedCount={unpublishedCount}
      />

      {showDiff ? (
        <DiffModal draft={payload} published={publishedSnapshot} onClose={() => setShowDiff(false)} />
      ) : null}

      {showPublishConfirm ? (
        <PublishConfirmModal
          serviceName={service.name}
          plansChanged={plansChangedCount}
          changeCount={unpublishedCount}
          publishing={publishing}
          onCancel={() => setShowPublishConfirm(false)}
          onConfirm={confirmPublish}
        />
      ) : null}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  inputMode,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "text" | "decimal" | "numeric";
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
      />
    </div>
  );
}

function UrlField({
  label,
  value,
  onChange,
  hint,
  inputType = "url",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  /** 相対パス（/logos/...）も扱う場合は text を指定 */
  inputType?: "url" | "text";
}) {
  const href = value ? safeExternalHref(value) : null;
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex gap-2">
        <input
          type={inputType}
          inputMode="url"
          value={value}
          placeholder={inputType === "url" ? "https://..." : "https://... または /logos/..."}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm"
        />
        <a
          href={href ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (!href) e.preventDefault();
          }}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-sm ${
            href ? "border-slate-300 text-slate-600 hover:bg-slate-50" : "border-slate-200 text-slate-300"
          }`}
        >
          ↗
        </a>
      </div>
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
    </div>
  );
}

function ToggleCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5"
      />
    </label>
  );
}

function BasicSection({
  categories,
  serviceRow,
  onChange,
}: {
  categories: Category[];
  serviceRow: Row;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-3">
      <SectionAccordion id="basic-info" title="基本情報" defaultOpen>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="サービス名"
            value={String(serviceRow.name ?? "")}
            onChange={(v) => onChange("name", v)}
          />
          <TextField
            label="提供開始年"
            inputMode="numeric"
            value={serviceRow.service_start_year != null ? String(serviceRow.service_start_year) : ""}
            onChange={(v) => onChange("service_start_year", v === "" ? null : Number(v))}
          />
          <TextField
            label="運営会社名"
            value={String(serviceRow.company_name ?? "")}
            onChange={(v) => onChange("company_name", v)}
          />
          <div className="sm:col-span-2">
            <UrlField
              label="公式サイトURL"
              value={String(serviceRow.official_url ?? "")}
              onChange={(v) => onChange("official_url", v)}
            />
          </div>
          <div className="sm:col-span-2">
            <UrlField
              label="アフィリエイトURL"
              value={String(serviceRow.affiliate_url ?? "")}
              onChange={(v) => onChange("affiliate_url", v)}
              hint="入力されている場合、本サイトの公式サイトボタンにはアフィリエイトURLが優先して使用されます。"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">ASP</label>
            <select
              value={String(serviceRow.affiliate_network ?? "A8")}
              onChange={(e) => onChange("affiliate_network", e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              {AFFILIATE_NETWORK_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">提携状況</label>
            <select
              value={String(serviceRow.affiliate_status ?? "inactive")}
              onChange={(e) => onChange("affiliate_status", e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              {AFFILIATE_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 space-y-2">
            <UrlField
              label="ロゴURL"
              inputType="text"
              value={String(serviceRow.logo_url ?? "")}
              onChange={(v) => {
                onChange("logo_url", v);
                onChange(CLEAR_LOGO_URL_KEY, false);
              }}
              hint="空のまま保存しても既存のロゴは保持されます。削除する場合は下のボタンを使ってください。"
            />
            {serviceRow.logo_url || serviceRow[CLEAR_LOGO_URL_KEY] === true ? (
              <button
                type="button"
                onClick={() => {
                  onChange("logo_url", "");
                  onChange(CLEAR_LOGO_URL_KEY, true);
                }}
                className="text-sm font-medium text-rose-700 hover:underline"
              >
                ロゴを削除
              </button>
            ) : null}
            {serviceRow[CLEAR_LOGO_URL_KEY] === true ? (
              <p className="text-xs text-rose-600">
                公開時にロゴが削除されます（下書き保存後に公開してください）
              </p>
            ) : null}
          </div>
          <TextField
            label="データセンター所在地"
            value={String(serviceRow.datacenter_location ?? "")}
            onChange={(v) => onChange("datacenter_location", v)}
          />
        </div>
        <div className="mt-3">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            〇〇とは（説明文）
          </label>
          <textarea
            value={String(serviceRow.about_text ?? "")}
            onChange={(e) => onChange("about_text", e.target.value)}
            rows={8}
            className="min-h-40 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed"
            placeholder={`${String(serviceRow.name || "サービス名")}とは…`}
          />
          <p className="mt-1.5 text-xs text-slate-500">
            サービス詳細ページの「{String(serviceRow.name || "サービス名")}とは」に表示されます。改行はそのまま反映されます。
          </p>
        </div>
        <div className="mt-3">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">カテゴリ</label>
          <select
            value={String(serviceRow.category_id ?? "")}
            onChange={(e) => onChange("category_id", e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </SectionAccordion>

      <SectionAccordion id="basic-publish" title="公開設定">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">ステータス</label>
            <select
              value={String(serviceRow.status ?? "draft")}
              onChange={(e) => onChange("status", e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="draft">draft</option>
              <option value="pending_review">pending_review</option>
              <option value="published">published</option>
              <option value="unpublished">unpublished</option>
              <option value="expired">expired</option>
            </select>
          </div>
          <TextField
            label="表示順"
            inputMode="numeric"
            value={serviceRow.display_order != null ? String(serviceRow.display_order) : "0"}
            onChange={(v) => onChange("display_order", v === "" ? 0 : Number(v))}
          />
        </div>
        <div className="mt-3 space-y-2">
          <ToggleCheckbox
            label="本サイトに表示"
            checked={serviceRow.is_site_visible !== false}
            onChange={(v) => onChange("is_site_visible", v)}
          />
          <p className="text-xs text-slate-500">
            OFF にすると本サイト全体（TOP・比較・一覧・sitemap 等）から非表示になります。管理画面には残ります。公開へ反映後に適用されます。
          </p>
          <ToggleCheckbox
            label="TOP「人気3社」に初期表示"
            checked={Boolean(serviceRow.show_in_top_featured_comparison)}
            onChange={(v) => onChange("show_in_top_featured_comparison", v)}
          />
          <ToggleCheckbox
            label="TOP「レンタルサーバーを比較」に初期表示"
            checked={Boolean(serviceRow.show_in_top_comparison)}
            onChange={(v) => onChange("show_in_top_comparison", v)}
          />
          <ToggleCheckbox
            label="アダルト利用可"
            checked={Boolean(serviceRow.adult_allowed)}
            onChange={(v) => onChange("adult_allowed", v)}
          />
        </div>
      </SectionAccordion>

      <SectionAccordion id="basic-editor" title="編集者評価">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="編集部スコア"
            inputMode="decimal"
            value={serviceRow.editor_score != null ? String(serviceRow.editor_score) : ""}
            onChange={(v) => onChange("editor_score", v === "" ? null : Number(v))}
          />
          <TextField
            label="総合スコア"
            inputMode="decimal"
            value={serviceRow.overall_score != null ? String(serviceRow.overall_score) : ""}
            onChange={(v) => onChange("overall_score", v === "" ? null : Number(v))}
          />
        </div>
        <div className="mt-3">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">編集部コメント</label>
          <textarea
            value={String(serviceRow.editor_comment ?? "")}
            onChange={(e) => onChange("editor_comment", e.target.value)}
            className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <ToggleCheckbox
            label="初心者向け"
            checked={Boolean(serviceRow.suitable_beginner)}
            onChange={(v) => onChange("suitable_beginner", v)}
          />
          <ToggleCheckbox
            label="ブログ向け"
            checked={Boolean(serviceRow.suitable_blog)}
            onChange={(v) => onChange("suitable_blog", v)}
          />
          <ToggleCheckbox
            label="ビジネス向け"
            checked={Boolean(serviceRow.suitable_business)}
            onChange={(v) => onChange("suitable_business", v)}
          />
          <ToggleCheckbox
            label="EC向け"
            checked={Boolean(serviceRow.suitable_ec)}
            onChange={(v) => onChange("suitable_ec", v)}
          />
        </div>
      </SectionAccordion>
    </div>
  );
}

function numOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function UnitField({
  label,
  value,
  unit,
  onChange,
  inputMode = "decimal",
}: {
  label: string;
  value: string;
  unit?: string;
  onChange: (value: string) => void;
  inputMode?: "text" | "decimal" | "numeric";
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm"
        />
        {unit ? <span className="shrink-0 text-sm text-slate-500">{unit}</span> : null}
      </div>
    </div>
  );
}

function PlansSection({
  plans,
  publishedPlans,
  expandedId,
  onExpand,
  onChange,
  onAdd,
  onDuplicate,
  onSoftDelete,
  onSetRepresentative,
  onSaveDraft,
  onShowDiff,
  onPublish,
  saving,
}: {
  plans: Row[];
  publishedPlans: Row[] | undefined;
  expandedId: string | null;
  onExpand: (id: string | null) => void;
  onChange: (planId: string, patch: Row) => void;
  onAdd: () => void;
  onDuplicate: (planId: string) => void;
  onSoftDelete: (planId: string) => void;
  onSetRepresentative: (planId: string) => void;
  onSaveDraft: () => void;
  onShowDiff: () => void;
  onPublish: () => void;
  saving: boolean;
}) {
  const changedCount = plans.filter((plan) => {
    const pub = publishedPlans?.find((p) => String(p.id) === String(plan.id));
    return JSON.stringify(plan) !== JSON.stringify(pub ?? null);
  }).length;

  const sorted = [...plans].sort((a, b) => {
    const ao = Number(a.display_order ?? 0);
    const bo = Number(b.display_order ?? 0);
    if (ao !== bo) return ao - bo;
    return String(a.name ?? "").localeCompare(String(b.name ?? ""), "ja");
  });

  return (
    <SectionAccordion
      id="plans"
      title="プラン"
      total={plans.length}
      filled={plans.filter((p) => p.is_published).length}
      changes={changedCount}
      defaultOpen
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            追加・編集は下書きです。公開へ反映するまで本サイトには出ません。
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="h-11 shrink-0 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white"
          >
            ＋ プランを追加
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
            <p className="text-sm text-slate-500">プランがまだありません。</p>
            <button
              type="button"
              onClick={onAdd}
              className="mt-3 h-11 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white"
            >
              プランを追加
            </button>
          </div>
        ) : null}

        {sorted.map((plan) => {
          const id = String(plan.id);
          const pub = publishedPlans?.find((p) => String(p.id) === id);
          const changed = JSON.stringify(plan) !== JSON.stringify(pub ?? null);
          const expanded = expandedId === id;
          const overrides = (plan.field_overrides as Row | null) ?? null;
          const overrideActive = Boolean(overrides && Object.keys(overrides).length > 0);
          const monthly = planMonthlyPrice(plan as unknown as ServicePlan);
          const displayPreview = formatPlanLabel(
            String(plan.name ?? ""),
            plan.display_name != null ? String(plan.display_name) : null,
          );

          return (
            <div key={id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => onExpand(expanded ? null : id)}
                className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{String(plan.name ?? "")}</p>
                    {plan.is_default_comparison_plan ? (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                        代表
                      </span>
                    ) : null}
                    {plan.campaign_monthly_price != null ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        キャンペーン
                      </span>
                    ) : null}
                    {overrideActive ? (
                      <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-800">
                        プラン別設定
                      </span>
                    ) : null}
                    {changed ? <StatusBadge status="changed" /> : null}
                    {!plan.is_published ? (
                      <StatusBadge status="unpublished" />
                    ) : (
                      <StatusBadge status="published" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    表示: {displayPreview || "—"}
                    {" ・ 月額 "}
                    {monthly != null ? `¥${Number(monthly).toLocaleString("ja-JP")}` : "—"}
                    {" ・ 容量 "}
                    {plan.storage_value != null
                      ? `${plan.storage_value}${plan.storage_unit ?? ""}`
                      : "—"}
                    {" ・ 契約 "}
                    {String(plan.billing_period ?? "—")}
                    {changed ? " ・ 未公開変更あり" : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-blue-700">
                  {expanded ? "閉じる" : "編集"}
                </span>
              </button>

              {!expanded ? (
                <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-2">
                  <button
                    type="button"
                    onClick={() => onExpand(id)}
                    className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicate(id)}
                    className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700"
                  >
                    複製
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(id, { is_published: false, publish_status: "draft" })}
                    className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700"
                  >
                    非公開
                  </button>
                  <button
                    type="button"
                    onClick={() => onSoftDelete(id)}
                    className="h-9 rounded-lg border border-red-300 px-3 text-xs font-medium text-red-700"
                  >
                    削除
                  </button>
                </div>
              ) : null}

              {expanded ? (
                <div className="space-y-4 border-t border-slate-100 p-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500">基本情報</p>
                    <div className="grid grid-cols-1 gap-3">
                      <TextField
                        label="プラン名"
                        value={String(plan.name ?? "")}
                        onChange={(v) => onChange(id, { name: v })}
                      />
                      <TextField
                        label="プラン表示名"
                        value={plan.display_name != null ? String(plan.display_name) : ""}
                        placeholder="空欄なら「プラン名＋プラン」で表示"
                        onChange={(v) => onChange(id, { display_name: v === "" ? null : v })}
                      />
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          プランの説明
                        </label>
                        <textarea
                          value={String(plan.description ?? "")}
                          onChange={(e) => onChange(id, { description: e.target.value })}
                          className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <UrlField
                        label="公式プランURL"
                        value={String(plan.official_url ?? "")}
                        onChange={(v) => onChange(id, { official_url: v })}
                      />
                      <ToggleCheckbox
                        label="代表プラン"
                        checked={Boolean(plan.is_default_comparison_plan)}
                        onChange={(v) => {
                          if (v) onSetRepresentative(id);
                          else onChange(id, { is_default_comparison_plan: false });
                        }}
                      />
                      <UnitField
                        label="表示順"
                        inputMode="numeric"
                        value={plan.display_order != null ? String(plan.display_order) : "0"}
                        onChange={(v) => onChange(id, { display_order: numOrNull(v) ?? 0 })}
                      />
                      <ToggleCheckbox
                        label="公開状態（公開へ反映後に本サイトへ）"
                        checked={Boolean(plan.is_published)}
                        onChange={(v) =>
                          onChange(id, {
                            is_published: v,
                            publish_status: v ? "published" : "draft",
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500">料金</p>
                    <div className="grid grid-cols-1 gap-3">
                      <UnitField
                        label="通常月額料金"
                        unit="円"
                        value={
                          plan.regular_monthly_price != null
                            ? String(plan.regular_monthly_price)
                            : ""
                        }
                        onChange={(v) => onChange(id, { regular_monthly_price: numOrNull(v) })}
                      />
                      <UnitField
                        label="キャンペーン月額料金"
                        unit="円"
                        value={
                          plan.campaign_monthly_price != null
                            ? String(plan.campaign_monthly_price)
                            : ""
                        }
                        onChange={(v) => onChange(id, { campaign_monthly_price: numOrNull(v) })}
                      />
                      <UnitField
                        label="実質月額料金"
                        unit="円"
                        value={
                          plan.effective_monthly_price != null
                            ? String(plan.effective_monthly_price)
                            : ""
                        }
                        onChange={(v) => onChange(id, { effective_monthly_price: numOrNull(v) })}
                      />
                      <UnitField
                        label="初期費用"
                        unit="円"
                        value={plan.initial_fee != null ? String(plan.initial_fee) : ""}
                        onChange={(v) => onChange(id, { initial_fee: numOrNull(v) })}
                      />
                      <TextField
                        label="最低契約期間"
                        value={String(plan.min_contract_period ?? "")}
                        onChange={(v) => onChange(id, { min_contract_period: v || null })}
                      />
                      <TextField
                        label="契約期間"
                        value={String(plan.billing_period ?? "")}
                        onChange={(v) => onChange(id, { billing_period: v || null })}
                      />
                      <UnitField
                        label="無料お試し期間"
                        unit="日"
                        inputMode="numeric"
                        value={plan.free_trial_days != null ? String(plan.free_trial_days) : ""}
                        onChange={(v) => onChange(id, { free_trial_days: numOrNull(v) })}
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500">
                      容量・性能
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-end gap-2">
                        <div className="min-w-0 flex-1">
                          <UnitField
                            label="容量"
                            value={plan.storage_value != null ? String(plan.storage_value) : ""}
                            onChange={(v) => onChange(id, { storage_value: numOrNull(v) })}
                          />
                        </div>
                        <div className="w-24">
                          <TextField
                            label="単位"
                            value={String(plan.storage_unit ?? "")}
                            onChange={(v) => onChange(id, { storage_unit: v || null })}
                          />
                        </div>
                      </div>
                      <TextField
                        label="ストレージ種類"
                        value={plan.storage_type != null ? String(plan.storage_type) : ""}
                        placeholder="SSD / NVMe など"
                        onChange={(v) => onChange(id, { storage_type: v || null })}
                      />
                      <TextField
                        label="CPU"
                        value={String(plan.cpu ?? "")}
                        onChange={(v) => onChange(id, { cpu: v || null })}
                      />
                      <TextField
                        label="メモリ"
                        value={String(plan.memory ?? "")}
                        onChange={(v) => onChange(id, { memory: v || null })}
                      />
                      <TextField
                        label="転送量"
                        value={String(plan.transfer_amount ?? "")}
                        onChange={(v) => onChange(id, { transfer_amount: v || null })}
                      />
                      <TextField
                        label="データベース数"
                        placeholder="例: 無制限 / 50 / 3個まで"
                        value={
                          plan.database_count != null ? String(plan.database_count) : ""
                        }
                        onChange={(v) =>
                          onChange(id, { database_count: v.trim() ? v.trim() : null })
                        }
                      />
                      <TextField
                        label="マルチドメイン数"
                        placeholder="例: 無制限 / 20個 / 100個以上"
                        value={
                          plan.multi_domain_count != null
                            ? String(plan.multi_domain_count)
                            : ""
                        }
                        onChange={(v) =>
                          onChange(id, {
                            multi_domain_count: v.trim() ? v.trim() : null,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500">
                      ドメイン・その他
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      <TextField
                        label="無料ドメイン数"
                        placeholder="例: 1 / 無制限 / 初回無料"
                        value={
                          plan.free_domain_count != null
                            ? String(plan.free_domain_count)
                            : ""
                        }
                        onChange={(v) =>
                          onChange(id, {
                            free_domain_count: v.trim() ? v.trim() : null,
                          })
                        }
                      />
                      <TextField
                        label="支払い方法"
                        value={String(plan.payment_methods ?? "")}
                        onChange={(v) => onChange(id, { payment_methods: v || null })}
                      />
                      <p className="text-xs text-slate-500">
                        備考は「プランの説明」欄に記載してください。
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-sm font-medium text-slate-800">比較値の設定</p>
                    <p className="mb-2 text-xs text-slate-500">
                      運営会社・サポート・SSL 等はサービス共通。プランだけ異なる場合のみ個別設定します。
                    </p>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => onChange(id, { field_overrides: {} })}
                        className={`h-11 w-full rounded-lg border px-3 text-sm font-medium ${
                          !overrideActive
                            ? "border-blue-500 bg-blue-50 text-blue-800"
                            : "border-slate-300 bg-white text-slate-600"
                        }`}
                      >
                        サービス共通値を使用
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onChange(id, {
                            field_overrides: overrideActive ? overrides : { _enabled: true },
                          })
                        }
                        className={`h-11 w-full rounded-lg border px-3 text-sm font-medium ${
                          overrideActive
                            ? "border-purple-500 bg-purple-50 text-purple-800"
                            : "border-slate-300 bg-white text-slate-600"
                        }`}
                      >
                        このプランだけ個別設定
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => onDuplicate(id)}
                      className="h-10 rounded-lg border border-slate-300 px-3 text-xs font-medium"
                    >
                      複製
                    </button>
                    <button
                      type="button"
                      onClick={() => onSoftDelete(id)}
                      className="h-10 rounded-lg border border-red-300 px-3 text-xs font-medium text-red-700"
                    >
                      削除
                    </button>
                    <button
                      type="button"
                      onClick={onSaveDraft}
                      disabled={saving}
                      className="ml-auto h-10 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white disabled:opacity-60"
                    >
                      下書き保存
                    </button>
                    <button
                      type="button"
                      onClick={onShowDiff}
                      className="h-10 rounded-lg border border-slate-300 px-3 text-xs font-medium"
                    >
                      差分確認
                    </button>
                    <button
                      type="button"
                      onClick={onPublish}
                      className="h-10 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white"
                    >
                      公開へ反映
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </SectionAccordion>
  );
}

function ComparisonFieldControl({
  field,
  row,
  onChange,
}: {
  field: ComparisonField;
  row: Row | undefined;
  onChange: (patch: BoolPatch) => void;
}) {
  if (field.field_type === "boolean") {
    const value = (row?.boolean_value as boolean | null) ?? null;
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-800">{field.name}</p>
        <TriStateControl value={value} onChange={(next) => onChange({ boolean_value: next })} name={field.slug} />
      </div>
    );
  }

  if (field.field_type === "number" || field.field_type === "rating") {
    const value = row?.number_value != null ? String(row.number_value) : "";
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-800">{field.name}</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            defaultValue={value}
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (raw === "") {
                onChange({ number_value: null });
                return;
              }
              const num = Number(raw);
              onChange({ number_value: Number.isFinite(num) ? num : null });
            }}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
          />
          {field.unit ? <span className="shrink-0 text-sm text-slate-500">{field.unit}</span> : null}
        </div>
      </div>
    );
  }

  const value = (row?.text_value as string | null) ?? "";
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-800">{field.name}</label>
      <input
        type="text"
        defaultValue={value}
        onChange={(e) => onChange({ text_value: e.target.value })}
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
      />
    </div>
  );
}

function ComparisonSection({
  sectionId,
  title,
  fields,
  values,
  published,
  onChange,
}: {
  sectionId: string;
  title: string;
  fields: ComparisonField[];
  values: Row[];
  published: Row[] | undefined;
  onChange: (fieldId: string, planId: string | null, patch: BoolPatch) => void;
}) {
  const stats = groupStats(fields, values, published);
  return (
    <SectionAccordion
      id={sectionId}
      title={title}
      filled={stats.filled}
      total={stats.total}
      changes={stats.changes}
      pending={stats.pending}
      defaultOpen
    >
      {fields.length === 0 ? (
        <p className="text-sm text-slate-500">対象の比較項目が登録されていません。</p>
      ) : (
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
              <ComparisonFieldControl
                field={field}
                row={getComparisonRow(values, field.id, null)}
                onChange={(patch) => onChange(field.id, null, patch)}
              />
            </div>
          ))}
        </div>
      )}
    </SectionAccordion>
  );
}

function CampaignsSection({
  campaigns,
  onAdd,
  onUpdate,
  onRemove,
}: {
  campaigns: Row[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Row) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <SectionAccordion
      id="campaigns"
      title="キャンペーン"
      total={campaigns.length}
      filled={campaigns.filter((c) => c.is_published).length}
      defaultOpen
    >
      <div className="space-y-3">
        <button
          type="button"
          onClick={onAdd}
          className="h-11 w-full rounded-lg border border-dashed border-blue-300 text-sm font-medium text-blue-700"
        >
          + キャンペーンを追加
        </button>
        {campaigns.map((campaign) => {
          const id = String(campaign.id);
          return (
            <div key={id} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <TextField
                    label="キャンペーン名"
                    value={String(campaign.name ?? "")}
                    onChange={(v) => onUpdate(id, { name: v })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(id)}
                  className="mt-6 h-9 shrink-0 rounded-lg border border-red-300 px-3 text-xs font-medium text-red-700"
                >
                  削除
                </button>
              </div>
              <TextField
                label="概要"
                value={String(campaign.summary ?? "")}
                onChange={(v) => onUpdate(id, { summary: v })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="クーポンコード"
                  value={String(campaign.coupon_code ?? "")}
                  onChange={(v) => onUpdate(id, { coupon_code: v })}
                />
                <TextField
                  label="終了日"
                  value={String(campaign.ends_on ?? "")}
                  placeholder="YYYY-MM-DD"
                  onChange={(v) => onUpdate(id, { ends_on: v })}
                />
              </div>
              <ToggleCheckbox
                label="公開する"
                checked={Boolean(campaign.is_published)}
                onChange={(v) => onUpdate(id, { is_published: v, publish_status: v ? "published" : "draft" })}
              />
            </div>
          );
        })}
        {campaigns.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            キャンペーンがまだありません。
          </p>
        ) : null}
      </div>
    </SectionAccordion>
  );
}

function SeoSection({
  seo,
  onChange,
}: {
  seo: Row;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <SectionAccordion id="seo" title="SEO" defaultOpen>
      <div className="space-y-3">
        <TextField
          label="SEOタイトル"
          value={String(seo.seo_title ?? "")}
          onChange={(v) => onChange("seo_title", v)}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">SEO description</label>
          <textarea
            value={String(seo.seo_description ?? "")}
            onChange={(e) => onChange("seo_description", e.target.value)}
            className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <UrlField
          label="canonical URL"
          value={String(seo.canonical_url ?? "")}
          onChange={(v) => onChange("canonical_url", v)}
        />
        <UrlField
          label="OG画像URL"
          value={String(seo.og_image_url ?? "")}
          onChange={(v) => onChange("og_image_url", v)}
        />
      </div>
    </SectionAccordion>
  );
}

function DiffModal({
  draft,
  published,
  onClose,
}: {
  draft: ServiceDraftPayload;
  published: ServiceDraftPayload | null;
  onClose: () => void;
}) {
  const rows = useMemo(() => {
    const items: { label: string; before: string; after: string }[] = [];
    const pubService = published?.service ?? {};
    for (const key of Object.keys(draft.service)) {
      if (SKIP_SERVICE_KEYS.has(key)) continue;
      const before = pubService[key];
      const after = draft.service[key];
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        items.push({ label: key, before: formatDiffValue(before), after: formatDiffValue(after) });
      }
    }
    if (JSON.stringify(draft.plans) !== JSON.stringify(published?.plans ?? [])) {
      items.push({
        label: "プラン",
        before: `${published?.plans.length ?? 0}件`,
        after: `${draft.plans.length}件`,
      });
    }
    if (JSON.stringify(draft.comparison_values) !== JSON.stringify(published?.comparison_values ?? [])) {
      items.push({
        label: "比較値",
        before: `${published?.comparison_values.length ?? 0}件`,
        after: `${draft.comparison_values.length}件`,
      });
    }
    if (JSON.stringify(draft.campaigns) !== JSON.stringify(published?.campaigns ?? [])) {
      items.push({
        label: "キャンペーン",
        before: `${published?.campaigns.length ?? 0}件`,
        after: `${draft.campaigns.length}件`,
      });
    }
    return items;
  }, [draft, published]);

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
    >
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 sm:max-w-lg sm:rounded-2xl sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">差分確認</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            閉じる
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">公開中の内容との差分はありません。</p>
          ) : (
            rows.map((row) => (
              <div key={row.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-800">{row.label}</p>
                <p className="mt-1 text-slate-500">公開中: {row.before}</p>
                <p className="mt-0.5 font-medium text-blue-700">変更後: {row.after}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PublishConfirmModal({
  serviceName,
  plansChanged,
  changeCount,
  publishing,
  onCancel,
  onConfirm,
}: {
  serviceName: string;
  plansChanged: number;
  changeCount: number;
  publishing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
    >
      <div className="w-full rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-2xl">
        <h2 className="text-lg font-semibold text-slate-900">公開へ反映しますか？</h2>
        <dl className="mt-4 space-y-2 text-sm text-slate-700">
          <div className="flex justify-between">
            <dt className="text-slate-500">サービス</dt>
            <dd className="font-medium">{serviceName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">変更されたプラン</dt>
            <dd className="font-medium">{plansChanged}件</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">未公開の変更件数</dt>
            <dd className="font-medium">{changeCount}件</dd>
          </div>
        </dl>
        <div className="mt-4">
          <p className="text-xs font-medium text-slate-500">影響を受けるページ</p>
          <ul className="mt-1.5 space-y-1 text-sm text-slate-700">
            {AFFECTED_PAGE_LABELS.map((label) => (
              <li key={label} className="rounded-lg bg-slate-50 px-3 py-1.5">
                {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={publishing}
            className="h-12 flex-1 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={publishing}
            className="h-12 flex-1 rounded-lg bg-emerald-600 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {publishing ? "公開中…" : "公開する"}
          </button>
        </div>
      </div>
    </div>
  );
}

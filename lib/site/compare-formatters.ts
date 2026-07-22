import type { ComparisonField, ServicePlan } from "@/lib/types/database";
import { formatPrice, formatStorage } from "@/lib/types/comparison";
import type { EnrichedService } from "@/lib/site/service-utils";
import {
  availableChannels,
  formatSupportDetailed,
  readSupportDetail,
  type SupportDetail,
} from "@/lib/site/support";

export type PublicCampaign = {
  id: string;
  service_id: string;
  name: string;
  summary: string | null;
  target_plan_ids: string[];
  discount_rate: number | null;
  discount_amount: number | null;
  ends_on: string | null;
  is_published: boolean;
  display_order: number;
};

export type MonthlyPriceParts = {
  /** 並び替え・最良判定用（キャンペーン優先） */
  raw: number | null;
  /** 通常料金テキスト（取り消し線側） */
  regularText: string | null;
  /** 強調側。キャンペーンが無い／同額なら通常料金 */
  emphasisText: string | null;
  /** 2行表示するか */
  showStrike: boolean;
  /** フォールバック1行テキスト */
  text: string;
};

const CHANNEL_LABEL = {
  phone: "電話",
  email: "メール",
  chat: "チャット",
} as const;

/** 日本時間の今日（YYYY-MM-DD） */
export function todayJstDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * 無料お試し期間。
 * 0日 = 「なし」、未登録 = 「-」
 */
export function formatTrialPeriod(
  days: number | null | undefined,
  empty = "-",
): string {
  if (days == null || Number.isNaN(Number(days))) return empty;
  const n = Number(days);
  if (n === 0) return "なし";
  return `${n}日間`;
}

/** プラン列 → comparison_values の順で無料お試し日数を取得 */
export function resolveTrialDays(
  item: EnrichedService,
  field?: ComparisonField | null,
): number | null {
  const fromPlan = item.representativePlan?.free_trial_days;
  if (fromPlan != null && !Number.isNaN(Number(fromPlan))) {
    return Number(fromPlan);
  }
  if (!field) return null;
  const value = item.comparisonByFieldId[field.id];
  if (value?.number_value != null && !Number.isNaN(Number(value.number_value))) {
    return Number(value.number_value);
  }
  return null;
}

/**
 * サポート手段（true のみ）。電話→メール→チャット固定順。
 * 例: 電話・メール・チャット / メール / -
 */
export function formatSupportMethods(
  detail: SupportDetail,
  empty = "-",
): { text: string; raw: number | null } {
  const available = availableChannels(detail);
  if (available.length === 0) {
    return { text: empty, raw: null };
  }
  return {
    text: available.map((c) => CHANNEL_LABEL[c]).join("・"),
    raw: available.length,
  };
}

export function formatSupportMethodsForService(
  item: EnrichedService,
  fields: ComparisonField[],
  empty = "-",
): { text: string; raw: number | null } {
  return formatSupportMethods(readSupportDetail(item, fields), empty);
}

/** @deprecated alias — TOP は formatSupportMethods を使う */
export function formatSupportCompactForCompare(
  detail: SupportDetail,
  empty = "-",
): { text: string; raw: number | null } {
  return formatSupportMethods(detail, empty);
}

export { formatSupportDetailed };

function parseEndsOn(endsOn: string): string | null {
  const m = endsOn.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** 終了日を過ぎていれば true（当日は有効） */
export function isCampaignEnded(
  endsOn: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!endsOn?.trim()) return false;
  const day = parseEndsOn(endsOn);
  if (!day) return false;
  return day < todayJstDateString(now);
}

function formatEndsOnShort(endsOn: string): string | null {
  const day = parseEndsOn(endsOn);
  if (!day) return null;
  const [, month, date] = day.split("-");
  return `${Number(month)}/${Number(date)}`;
}

/**
 * 公開中かつ未終了のキャンペーンから最上位1件。
 * display_order 昇順 → 同順なら ends_on が近いもの。
 */
export function getActiveCampaign(
  campaigns: PublicCampaign[] | null | undefined,
  options?: {
    planId?: string | null;
    now?: Date;
  },
): PublicCampaign | null {
  if (!campaigns?.length) return null;
  const now = options?.now ?? new Date();
  const planId = options?.planId ?? null;

  const active = campaigns
    .filter((c) => c.is_published)
    .filter((c) => !isCampaignEnded(c.ends_on, now))
    .filter((c) => {
      const targets = c.target_plan_ids ?? [];
      if (targets.length === 0) return true;
      if (!planId) return true;
      return targets.includes(planId);
    })
    .slice()
    .sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      const ae = a.ends_on ?? "9999-99-99";
      const be = b.ends_on ?? "9999-99-99";
      return ae.localeCompare(be);
    });

  return active[0] ?? null;
}

/**
 * 比較表向けの短いキャンペーン文言。
 * 終了日優先 → 割引率 → 概要 → 名称
 */
export function formatCampaignSummary(
  campaign: PublicCampaign | null | undefined,
  empty = "-",
): string {
  if (!campaign) return empty;

  if (campaign.ends_on) {
    const short = formatEndsOnShort(campaign.ends_on);
    if (short) {
      const hasDiscount =
        campaign.discount_rate != null ||
        campaign.discount_amount != null ||
        /割引|OFF|オフ|円引/i.test(
          `${campaign.name ?? ""} ${campaign.summary ?? ""}`,
        );
      return hasDiscount ? `${short}まで割引中` : `${short}までキャンペーン`;
    }
  }

  if (campaign.discount_rate != null && !Number.isNaN(Number(campaign.discount_rate))) {
    return `期間限定${Number(campaign.discount_rate)}%OFF`;
  }

  const summary = campaign.summary?.trim();
  if (summary) {
    return summary.length > 18 ? `${summary.slice(0, 17)}…` : summary;
  }

  const name = campaign.name?.trim();
  if (name) {
    return name.length > 18 ? `${name.slice(0, 17)}…` : name;
  }

  return empty;
}

export function resolveActiveCampaignText(
  item: EnrichedService,
  empty = "-",
): { text: string; raw: string | null } {
  const campaign = getActiveCampaign(item.campaigns ?? [], {
    planId: item.representativePlan?.id ?? null,
  });
  const text = formatCampaignSummary(campaign, empty);
  return { text, raw: text === empty ? null : text };
}

/**
 * 通常料金 / キャンペーン料金の2行表示用。
 * 同額またはキャンペーン未設定なら通常のみ。
 */
export function formatMonthlyPrice(
  plan: ServicePlan | null | undefined,
  empty = "-",
): MonthlyPriceParts {
  if (!plan) {
    return {
      raw: null,
      regularText: null,
      emphasisText: null,
      showStrike: false,
      text: empty,
    };
  }

  const regular =
    plan.regular_monthly_price != null
      ? Number(plan.regular_monthly_price)
      : null;
  const campaign =
    plan.campaign_monthly_price != null
      ? Number(plan.campaign_monthly_price)
      : null;

  const hasDistinctCampaign =
    campaign != null &&
    !Number.isNaN(campaign) &&
    regular != null &&
    !Number.isNaN(regular) &&
    campaign !== regular;

  if (hasDistinctCampaign) {
    const campaignLabel = `${formatPrice(campaign)}〜`;
    return {
      raw: campaign,
      regularText: formatPrice(regular),
      emphasisText: campaignLabel,
      showStrike: true,
      text: campaignLabel,
    };
  }

  const single =
    plan.effective_monthly_price ??
    campaign ??
    regular;

  if (single == null || Number.isNaN(Number(single))) {
    return {
      raw: null,
      regularText: null,
      emphasisText: null,
      showStrike: false,
      text: empty,
    };
  }

  const formatted = `${formatPrice(Number(single))}〜`;
  return {
    raw: Number(single),
    regularText: null,
    emphasisText: formatted,
    showStrike: false,
    text: formatted,
  };
}

/** ランキングカード等向けの月額表示（必ず「〜」付き） */
export function formatMonthlyPriceLabel(
  plan: ServicePlan | null | undefined,
  empty = "—",
): string {
  return formatMonthlyPrice(plan, empty).text;
}

export function formatBooleanValue(
  value: boolean | null | undefined,
  empty = "-",
): string {
  if (value == null) return empty;
  return value ? "○" : "—";
}

export function formatStorageCapacity(
  plan: ServicePlan | null | undefined,
  empty = "-",
): { text: string; raw: number | null } {
  if (!plan || plan.storage_value == null) {
    return { text: empty, raw: null };
  }
  return {
    text: formatStorage(plan.storage_value, plan.storage_unit),
    raw: plan.storage_value,
  };
}

/** ストレージ種類: comparison_values → plan.storage_type */
export function resolveStorageTypeText(
  item: EnrichedService,
  field?: ComparisonField | null,
  empty = "-",
): { text: string; raw: string | null } {
  if (field) {
    const fromValue = item.comparisonByFieldId[field.id]?.text_value?.trim();
    if (fromValue) return { text: fromValue, raw: fromValue };
  }
  const fromPlan = item.representativePlan?.storage_type?.trim();
  if (fromPlan) return { text: fromPlan, raw: fromPlan };
  return { text: empty, raw: null };
}

export function isFreeTrialField(
  field: Pick<ComparisonField, "slug" | "name">,
): boolean {
  return (
    field.slug === "free-trial-days" ||
    /無料お試し|お試し期間/.test(field.name) ||
    /free-trial/i.test(field.slug)
  );
}

export function isCampaignField(
  field: Pick<ComparisonField, "slug" | "name">,
): boolean {
  return (
    field.slug === "campaign" ||
    field.name === "キャンペーン"
  );
}

export function isStorageTypeField(
  field: Pick<ComparisonField, "slug" | "name">,
): boolean {
  return (
    field.slug === "storage-type" ||
    /ストレージ.?種類|storage.?type/i.test(`${field.slug} ${field.name}`)
  );
}

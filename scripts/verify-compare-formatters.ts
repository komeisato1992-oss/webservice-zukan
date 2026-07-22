import {
  formatTrialPeriod,
  formatSupportMethods,
  formatCampaignSummary,
  formatMonthlyPrice,
  formatBooleanValue,
  getActiveCampaign,
  isCampaignEnded,
  todayJstDateString,
} from "../lib/site/compare-formatters";
import { resolveFieldNameDisplay } from "../lib/site/field-name-display";
import type { ServicePlan } from "../lib/types/database";

const asserts: string[] = [];
function check(name: string, ok: boolean, detail?: string) {
  asserts.push(
    `${ok ? "OK" : "NG"} ${name}${detail ? ` :: ${detail}` : ""}`,
  );
}

check("trial null", formatTrialPeriod(null) === "-");
check("trial 0", formatTrialPeriod(0) === "なし");
check("trial 30", formatTrialPeriod(30) === "30日間");
check(
  "support phone email",
  formatSupportMethods({
    phone: true,
    email: true,
    chat: false,
    phoneHours: null,
    emailHours: null,
    chatHours: null,
    phoneConditions: null,
    chatType: null,
    reception24h: null,
    support24h: null,
    weekends: null,
    sourceUrl: null,
    checkedAt: null,
    notes: null,
    compositeNote: null,
  }).text === "電話・メール",
);
check(
  "support all false",
  formatSupportMethods({
    phone: false,
    email: false,
    chat: false,
    phoneHours: null,
    emailHours: null,
    chatHours: null,
    phoneConditions: null,
    chatType: null,
    reception24h: null,
    support24h: null,
    weekends: null,
    sourceUrl: null,
    checkedAt: null,
    notes: null,
    compositeNote: null,
  }).text === "-",
);
check("boolean true", formatBooleanValue(true) === "○");
check("boolean false", formatBooleanValue(false) === "—");
check("boolean null", formatBooleanValue(null) === "-");
check("ended past", isCampaignEnded("2020-01-01") === true);
check("ended future", isCampaignEnded("2099-12-31") === false);
check("today jst", /^\d{4}-\d{2}-\d{2}$/.test(todayJstDateString()));

const camp = getActiveCampaign([
  {
    id: "1",
    service_id: "s",
    name: "旧",
    summary: null,
    target_plan_ids: [],
    discount_rate: 10,
    discount_amount: null,
    ends_on: "2020-01-01",
    is_published: true,
    display_order: 0,
  },
  {
    id: "2",
    service_id: "s",
    name: "新",
    summary: null,
    target_plan_ids: [],
    discount_rate: 20,
    discount_amount: null,
    ends_on: "2099-08-10",
    is_published: true,
    display_order: 1,
  },
]);
check("active campaign", camp?.id === "2");
check("campaign fmt", formatCampaignSummary(camp!) === "8/10まで割引中");

const basePlan = {
  id: "p",
  service_id: "s",
  name: "A",
  slug: "a",
  initial_fee: null,
  billing_period: null,
  storage_value: null,
  storage_unit: null,
  description: null,
  display_order: 0,
  is_published: true,
  is_default_comparison_plan: false,
  is_recommended: false,
  official_url: null,
  created_at: "",
  updated_at: "",
} satisfies Partial<ServicePlan>;

const price = formatMonthlyPrice({
  ...basePlan,
  regular_monthly_price: 1430,
  campaign_monthly_price: 990,
  effective_monthly_price: 990,
} as ServicePlan);
check(
  "price strike",
  price.showStrike === true &&
    price.regularText === "¥1,430" &&
    price.emphasisText === "¥990",
);

const same = formatMonthlyPrice({
  ...basePlan,
  regular_monthly_price: 990,
  campaign_monthly_price: 990,
  effective_monthly_price: 990,
} as ServicePlan);
check("price same", same.showStrike === false && same.text === "¥990");

const trialLabel = resolveFieldNameDisplay("無料お試し期間", "free-trial-days");
check("trial label", trialLabel.lines.join("/") === "無料お試し/期間");
const storageLabel = resolveFieldNameDisplay("容量", "storage");
const typeLabel = resolveFieldNameDisplay("ストレージ種類", "storage-type");
check("storage label", storageLabel.shortLabel === "容量");
check("storage-type label", typeLabel.lines.join("/") === "ストレージ/種類");

console.log(asserts.join("\n"));
const fails = asserts.filter((a) => a.startsWith("NG")).length;
console.log("FAILS", fails);
if (fails > 0) process.exit(1);

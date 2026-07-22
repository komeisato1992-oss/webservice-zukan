import { resolvePlanSlug } from "@/lib/cms/plan-slug";
import type { ServiceDraftPayload } from "@/lib/cms/types";

/** Columns on service_plans that scraping / sheets may patch. */
export const PLAN_FIELD_KEYS = new Set([
  "name",
  "display_name",
  "slug",
  "description",
  "official_url",
  "regular_monthly_price",
  "campaign_monthly_price",
  "effective_monthly_price",
  "initial_fee",
  "billing_period",
  "min_contract_period",
  "free_trial_days",
  "storage_value",
  "storage_unit",
  "storage_type",
  "cpu",
  "memory",
  "transfer_amount",
  "database_count",
  "multi_domain_count",
  "free_domain_count",
  "payment_methods",
  "is_default_comparison_plan",
  "is_recommended",
  "is_published",
  "display_order",
  "publish_status",
]);

/**
 * Normalize plan names for matching (not for display).
 * Strips whitespace, プラン suffix, fullwidth digits, case.
 */
export function normalizePlanMatchKey(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/プラン$/u, "")
    .replace(/[‐‑‒–—―ー−-]/g, "")
    .toLowerCase();
}

export function resolvePlanFieldKey(fieldKey: string): {
  kind: "plan" | "new_plan" | "other";
  column: string;
  newPlanKey?: string;
} {
  if (fieldKey.startsWith("new_plan:")) {
    const rest = fieldKey.slice("new_plan:".length);
    const sep = rest.indexOf(":");
    if (sep > 0) {
      return {
        kind: "new_plan",
        newPlanKey: rest.slice(0, sep),
        column: rest.slice(sep + 1),
      };
    }
  }
  if (fieldKey.startsWith("plan.")) {
    return { kind: "plan", column: fieldKey.slice(5) };
  }
  if (PLAN_FIELD_KEYS.has(fieldKey)) {
    return { kind: "plan", column: fieldKey };
  }
  return { kind: "other", column: fieldKey };
}

export function createDraftPlan(
  serviceId: string,
  opts?: {
    name?: string;
    displayOrder?: number;
    seed?: Record<string, unknown>;
    serviceSlug?: string | null;
    takenSlugs?: Set<string>;
  },
): Record<string, unknown> {
  const name = opts?.name?.trim() || "新しいプラン";
  const seed = opts?.seed ?? {};
  const seedSlug = typeof seed.slug === "string" ? seed.slug : null;
  const taken = opts?.takenSlugs ?? new Set<string>();
  const slug = resolvePlanSlug({
    name,
    currentSlug: seedSlug,
    serviceSlug: opts?.serviceSlug,
    takenSlugs: taken,
    preferName: !seedSlug,
  });
  taken.add(slug);
  return {
    id: crypto.randomUUID(),
    service_id: serviceId,
    name,
    display_name: null,
    description: null,
    official_url: null,
    regular_monthly_price: null,
    campaign_monthly_price: null,
    effective_monthly_price: null,
    initial_fee: null,
    billing_period: null,
    min_contract_period: null,
    free_trial_days: null,
    storage_value: null,
    storage_unit: "GB",
    storage_type: null,
    cpu: null,
    memory: null,
    transfer_amount: null,
    database_count: null,
    multi_domain_count: null,
    free_domain_count: null,
    payment_methods: null,
    display_order: opts?.displayOrder ?? 0,
    is_published: false,
    is_default_comparison_plan: false,
    is_recommended: false,
    field_overrides: {},
    publish_status: "draft",
    has_unpublished_changes: true,
    ...seed,
    // seed の不正 slug を最終的に上書き（制約違反防止）
    slug,
  };
}

export function duplicateDraftPlan(
  plan: Record<string, unknown>,
  displayOrder: number,
  opts?: { serviceSlug?: string | null; takenSlugs?: Set<string> },
): Record<string, unknown> {
  const name = `${String(plan.name ?? "プラン")} のコピー`;
  const taken = opts?.takenSlugs ?? new Set<string>();
  if (typeof plan.slug === "string" && plan.slug) taken.add(plan.slug);
  return createDraftPlan(String(plan.service_id ?? ""), {
    name,
    displayOrder,
    serviceSlug: opts?.serviceSlug,
    takenSlugs: taken,
    seed: {
      ...plan,
      id: crypto.randomUUID(),
      name,
      is_published: false,
      is_default_comparison_plan: false,
      publish_status: "draft",
      has_unpublished_changes: true,
      display_order: displayOrder,
    },
  });
}

/** Soft-delete: unpublish if ever published; otherwise drop from draft. */
export function removeOrUnpublishPlan(
  payload: ServiceDraftPayload,
  planId: string,
  publishedPlanIds: Set<string>,
): ServiceDraftPayload {
  if (publishedPlanIds.has(planId)) {
    return {
      ...payload,
      plans: payload.plans.map((p) =>
        String(p.id) === planId
          ? {
              ...p,
              is_published: false,
              publish_status: "unpublished",
              has_unpublished_changes: true,
              is_default_comparison_plan: false,
            }
          : p,
      ),
    };
  }
  return {
    ...payload,
    plans: payload.plans.filter((p) => String(p.id) !== planId),
  };
}

export function applyPlanFieldValue(
  plan: Record<string, unknown>,
  column: string,
  value: unknown,
): Record<string, unknown> {
  if (!PLAN_FIELD_KEYS.has(column) && column !== "field_overrides") {
    return plan;
  }
  return {
    ...plan,
    [column]: value,
    has_unpublished_changes: true,
    publish_status:
      plan.publish_status === "published" ? "pending_review" : plan.publish_status ?? "draft",
  };
}

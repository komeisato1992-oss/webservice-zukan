import type {
  ComparisonField,
  ComparisonValue,
  Service,
} from "@/lib/types/database";
import { hasComparisonValue } from "@/lib/types/comparison";
import { PURPOSE_OPTIONS, type PurposeOption } from "@/lib/site/content";
import type { AffiliateLink, ServicePlan } from "@/lib/types/database";
import type { PublicCampaign } from "@/lib/site/compare-formatters";

export type ServiceWithRelations = Service & {
  affiliate_links?: AffiliateLink[] | null;
};

export type EnrichedService = {
  service: Service;
  affiliateLinks: AffiliateLink[];
  /** 公開中プラン（display_order 順） */
  plans: ServicePlan[];
  representativePlan: ServicePlan | null;
  /** fieldId -> value（サービス単位。Client へ渡せるよう Record） */
  comparisonByFieldId: Record<string, ComparisonValue>;
  /** planId -> fieldId -> value（プラン固有。無い項目はサービス単位を使う） */
  comparisonByPlanId: Record<string, Record<string, ComparisonValue>>;
  /** 公開中キャンペーン（終了判定は表示時） */
  campaigns?: PublicCampaign[];
  highlightLabels: string[];
};

function textHaystack(service: Service): string {
  return [service.recommended_uses, service.catchphrase, service.summary, service.description]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

export function matchPurpose(service: Service, purpose: PurposeOption): boolean {
  const hay = textHaystack(service);
  return purpose.keywords.some((kw) => hay.includes(kw.toLowerCase()));
}

export function getPurposeById(id: string): PurposeOption | undefined {
  return PURPOSE_OPTIONS.find((p) => p.id === id);
}

export function filterServicesByPurpose(
  services: EnrichedService[],
  purposeId: string,
): EnrichedService[] {
  const purpose = getPurposeById(purposeId);
  if (!purpose) return [];
  return services.filter((s) => matchPurpose(s.service, purpose));
}

/** 比較表で優先表示するフィールド slug 候補 */
const PREFERRED_FIELD_SLUGS = [
  "free-ssl",
  "ssl",
  "ssl-free",
  "backup",
  "auto-backup",
  "automatic-backup",
  "support",
  "wordpress",
  "wordpress-install",
  "wp",
];

export function pickComparisonColumns(fields: ComparisonField[]): ComparisonField[] {
  const bySlug = new Map(fields.map((f) => [f.slug, f]));
  const picked: ComparisonField[] = [];
  const used = new Set<string>();

  for (const slug of PREFERRED_FIELD_SLUGS) {
    const field = bySlug.get(slug);
    if (field && !used.has(field.id)) {
      picked.push(field);
      used.add(field.id);
    }
  }

  for (const field of fields.filter((f) => f.is_highlighted)) {
    if (!used.has(field.id) && picked.length < 6) {
      picked.push(field);
      used.add(field.id);
    }
  }

  for (const field of fields) {
    if (!used.has(field.id) && picked.length < 6) {
      picked.push(field);
      used.add(field.id);
    }
  }

  return picked;
}

export function pickHighlightLabels(
  fields: ComparisonField[],
  valuesByField: Record<string, ComparisonValue> | Map<string, ComparisonValue>,
  limit = 3,
): string[] {
  const labels: string[] = [];
  const candidates = [
    ...fields.filter((f) => f.is_highlighted),
    ...fields.filter((f) => !f.is_highlighted),
  ];

  const get = (id: string) =>
    valuesByField instanceof Map
      ? valuesByField.get(id)
      : valuesByField[id];

  for (const field of candidates) {
    if (labels.length >= limit) break;
    const value = get(field.id);
    if (!hasComparisonValue(field, value)) continue;

    if (field.field_type === "boolean") {
      if (value?.boolean_value === true) labels.push(field.name);
      continue;
    }
    if (field.field_type === "select" || field.field_type === "text") {
      const text = value?.text_value?.trim();
      if (text) labels.push(`${field.name}: ${text}`);
    }
  }

  return labels;
}

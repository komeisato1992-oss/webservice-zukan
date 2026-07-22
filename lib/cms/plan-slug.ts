import {
  isValidPlanSlug,
  sanitizePlanSlug,
  slugifyJaPlanName,
} from "@/lib/scraping/utils/text";

/**
 * プラン slug を制約準拠で決定する。
 * - 既存の有効 slug は原則維持（保存のたびに変えない）
 * - 日本語名は辞書／英数字化、空なら serviceSlug-plan-NNN
 * - 同一サービス内で重複しない
 */
export function resolvePlanSlug(opts: {
  name: string;
  currentSlug?: string | null;
  serviceSlug?: string | null;
  takenSlugs: Set<string>;
  /** true のとき current が有効でも名前から再生成を試みる（新規作成時） */
  preferName?: boolean;
}): string {
  const taken = opts.takenSlugs;
  const serviceBase =
    sanitizePlanSlug(opts.serviceSlug) ||
    sanitizePlanSlug(slugifyJaPlanName(opts.serviceSlug ?? "")) ||
    "service";

  const keepCurrent =
    !opts.preferName &&
    isValidPlanSlug(opts.currentSlug) &&
    !taken.has(String(opts.currentSlug));
  if (keepCurrent) return String(opts.currentSlug);

  const fromCurrent = sanitizePlanSlug(opts.currentSlug);
  const fromName = sanitizePlanSlug(slugifyJaPlanName(opts.name));
  const base = fromName || fromCurrent || `${serviceBase}-plan`;

  return uniquifySlug(base, taken, serviceBase);
}

function uniquifySlug(
  base: string,
  taken: Set<string>,
  serviceBase: string,
): string {
  const root = sanitizePlanSlug(base) || `${serviceBase}-plan`;
  if (!taken.has(root)) return root;

  for (let i = 1; i <= 999; i += 1) {
    const candidate = `${root}-${String(i).padStart(3, "0")}`;
    if (!taken.has(candidate)) return candidate;
  }

  const fallback = `${serviceBase}-plan-${Date.now().toString(36)}`;
  return sanitizePlanSlug(fallback) || `${serviceBase}-plan-001`;
}

/** 下書き／公開前に全プランの slug を正規化（有効なものは維持） */
export function normalizeDraftPlanSlugs(
  plans: Record<string, unknown>[],
  serviceSlug?: string | null,
): Record<string, unknown>[] {
  const taken = new Set<string>();
  const result: Record<string, unknown>[] = [];

  for (const plan of plans) {
    const name = String(plan.name ?? "plan");
    const current = typeof plan.slug === "string" ? plan.slug : "";
    const slug = resolvePlanSlug({
      name,
      currentSlug: current,
      serviceSlug,
      takenSlugs: taken,
    });
    taken.add(slug);
    result.push({ ...plan, slug });
  }

  return result;
}

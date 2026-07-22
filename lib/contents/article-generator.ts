import type {
  ArticleCandidateInput,
  ArticleGenerator,
  GeneratedArticleCandidate,
} from "@/lib/contents/types";

/**
 * テンプレートベースの記事候補生成。
 * 将来 AI API 実装へ差し替え可能な共通インターフェース。
 */
export class TemplateArticleGenerator implements ArticleGenerator {
  async generate(
    input: ArticleCandidateInput,
  ): Promise<GeneratedArticleCandidate> {
    const highlights =
      input.highlights.length > 0
        ? input.highlights
        : ["公式サイトの最新情報を確認しました。"];
    const highlightLines = highlights.map((h) => `・${h}`).join("\n");
    const fetchedLabel = formatDateJa(input.fetchedAt);
    const expiresAt = input.campaignEndDate ?? null;

    const title = `${input.serviceName}の最新情報（${fetchedLabel}時点）`;
    const summary = `${input.serviceName}について、取得した公式情報をもとにした更新候補です。公開前に内容を確認してください。`;

    const notes = [
      "本記事はスクレイピング結果から自動生成した候補です。誇張表現は避け、取得元にない内容は追加していません。",
      "公開前に必ず内容を確認・修正してください。",
      ...(input.warnings ?? []).slice(0, 5),
    ];

    const body = [
      `## 概要`,
      `${input.serviceName}の公式情報をもとに、${fetchedLabel}時点の更新候補をまとめました。`,
      ``,
      `## 確認できたポイント`,
      highlightLines,
      ``,
      `## 出典`,
      input.sourceUrl
        ? `公式ページ: ${input.sourceUrl}`
        : "公式ページ: （URL未取得）",
      `情報取得日: ${fetchedLabel}`,
      expiresAt ? `有効期限候補: ${formatDateJa(expiresAt)}` : "",
      ``,
      `## 注意事項`,
      ...notes.map((n) => `・${n}`),
    ]
      .filter(Boolean)
      .join("\n");

    return { title, summary, body, expiresAt, notes };
  }
}

export function createArticleGenerator(): ArticleGenerator {
  // 将来: process.env.OPENAI_API_KEY 等があれば AI 実装へ差し替え
  return new TemplateArticleGenerator();
}

function formatDateJa(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** スクレイピング結果からハイライト候補を抽出 */
export function extractHighlightsFromScrape(result: unknown): {
  highlights: string[];
  campaignEndDate: string | null;
  sourceUrl: string | null;
} {
  const highlights: string[] = [];
  let campaignEndDate: string | null = null;
  let sourceUrl: string | null = null;

  if (!result || typeof result !== "object") {
    return { highlights, campaignEndDate, sourceUrl };
  }

  const data = result as Record<string, unknown>;
  if (Array.isArray(data.sourceUrls) && typeof data.sourceUrls[0] === "string") {
    sourceUrl = data.sourceUrls[0];
  }
  if (typeof data.officialUrl === "string") {
    sourceUrl = sourceUrl ?? data.officialUrl;
  }

  const plans = Array.isArray(data.plans) ? data.plans : [];
  for (const plan of plans.slice(0, 5)) {
    if (!plan || typeof plan !== "object") continue;
    const p = plan as Record<string, unknown>;
    const name =
      typeof p.name === "object" && p.name && "value" in (p.name as object)
        ? String((p.name as { value?: unknown }).value ?? "")
        : typeof p.name === "string"
          ? p.name
          : "";

    const pick = (key: string): unknown => {
      const v = p[key];
      if (v && typeof v === "object" && "value" in v && "status" in v) {
        const field = v as { status?: string; value?: unknown };
        if (field.status === "found") return field.value;
        return null;
      }
      return v ?? null;
    };

    const initialFee = pick("initialFee");
    const campaign = pick("campaignMonthlyPrice");
    const effective = pick("effectiveMonthlyPrice");

    if (initialFee === 0 || initialFee === "0") {
      highlights.push(
        name
          ? `${name}: 初期費用無料の表記を確認`
          : "初期費用無料の表記を確認",
      );
    }
    if (campaign != null && campaign !== "") {
      highlights.push(
        name
          ? `${name}: キャンペーン月額 ${String(campaign)} の表記を確認`
          : `キャンペーン月額 ${String(campaign)} の表記を確認`,
      );
    }
    if (effective != null && campaign != null && effective !== campaign) {
      highlights.push(
        name
          ? `${name}: 月額料金の更新候補あり`
          : "月額料金の更新候補あり",
      );
    }

    const end =
      pick("campaignEndDate") ??
      pick("campaign_end_date") ??
      pick("expiresAt");
    if (typeof end === "string" && end.trim()) {
      campaignEndDate = campaignEndDate ?? end;
      highlights.push(`キャンペーン終了日候補: ${end}`);
    }
  }

  const comparisons = Array.isArray(data.comparisonValues)
    ? data.comparisonValues
    : [];
  for (const row of comparisons.slice(0, 20)) {
    if (!row || typeof row !== "object") continue;
    const c = row as {
      fieldSlug?: string;
      status?: string;
      value?: unknown;
    };
    if (c.status !== "found") continue;
    const slug = c.fieldSlug ?? "";
    if (/campaign|キャッシュバック|割引|無料|改定|メンテナンス|障害/.test(slug)) {
      highlights.push(`${slug}: ${String(c.value ?? "")}`);
    }
  }

  const warnings = Array.isArray(data.warnings) ? data.warnings : [];
  for (const w of warnings.slice(0, 3)) {
    if (typeof w === "string" && /キャンペーン|料金|改定|終了/.test(w)) {
      highlights.push(w);
    }
  }

  const unique = Array.from(new Set(highlights)).slice(0, 8);
  if (unique.length === 0) {
    unique.push("公式サイトから料金・プラン情報を再取得しました。");
  }

  return { highlights: unique, campaignEndDate, sourceUrl };
}

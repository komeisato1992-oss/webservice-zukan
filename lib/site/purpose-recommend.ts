/**
 * 重視したい条件から探す — おすすめ3件選定ロジック（共有モジュール）
 */
import type { ComparisonField } from "@/lib/types/database";
import type { EnrichedService } from "@/lib/site/service-utils";
import { hasComparisonValue } from "@/lib/types/comparison";

export type PurposeRecommendResult = {
  purposeId: string;
  items: Array<{
    item: EnrichedService;
    reason: string;
    metrics: Array<{ label: string; value: string }>;
  }>;
};

function planPrice(item: EnrichedService): number | null {
  const plan = item.representativePlan;
  if (!plan) return null;
  return (
    plan.effective_monthly_price ??
    plan.campaign_monthly_price ??
    plan.regular_monthly_price
  );
}

function findField(
  fields: ComparisonField[],
  patterns: RegExp[],
): ComparisonField | undefined {
  return fields.find(
    (f) =>
      patterns.some((p) => p.test(f.slug)) ||
      patterns.some((p) => p.test(f.name)),
  );
}

function fieldNumber(
  item: EnrichedService,
  field: ComparisonField | undefined,
): number | null {
  if (!field) return null;
  const v = item.comparisonByFieldId[field.id];
  if (!hasComparisonValue(field, v)) return null;
  if (field.field_type === "number" || field.field_type === "rating") {
    return v?.number_value ?? null;
  }
  if (field.field_type === "boolean") {
    return v?.boolean_value == null ? null : v.boolean_value ? 1 : 0;
  }
  return null;
}

function fieldText(
  item: EnrichedService,
  field: ComparisonField | undefined,
): string | null {
  if (!field) return null;
  const v = item.comparisonByFieldId[field.id];
  if (!hasComparisonValue(field, v)) return null;
  return (
    v?.text_value?.trim() ||
    (v?.number_value != null ? String(v.number_value) : null) ||
    (v?.boolean_value != null ? (v.boolean_value ? "対応" : "非対応") : null)
  );
}

function hasKeyword(item: EnrichedService, keywords: string[]): boolean {
  const hay = [
    item.service.recommended_uses,
    item.service.catchphrase,
    item.service.about_text,
  ]
    .filter(Boolean)
    .join(" ");
  return keywords.some((k) => hay.includes(k));
}

function tieBreak(a: EnrichedService, b: EnrichedService): number {
  // 1. おすすめ優先度（is_featured）
  if (a.service.is_featured !== b.service.is_featured) {
    return a.service.is_featured ? -1 : 1;
  }
  // 2. 総合評価
  const sa = a.service.editor_score;
  const sb = b.service.editor_score;
  if (sa != null && sb != null && sa !== sb) return sb - sa;
  if (sa != null && sb == null) return -1;
  if (sa == null && sb != null) return 1;
  // 3. 表示順
  return (
    a.service.display_order - b.service.display_order ||
    a.service.name.localeCompare(b.service.name, "ja")
  );
}

function formatPriceYen(n: number | null): string {
  if (n == null) return "-";
  return `¥${Math.round(n).toLocaleString("ja-JP")}〜`;
}

type Scored = {
  item: EnrichedService;
  score: number;
  hasData: boolean;
  reason: string;
  metrics: Array<{ label: string; value: string }>;
};

function rank(scored: Scored[], limit = 3): PurposeRecommendResult["items"] {
  return scored
    .filter((s) => s.hasData)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return tieBreak(a.item, b.item);
    })
    .slice(0, limit)
    .map(({ item, reason, metrics }) => ({ item, reason, metrics }));
}

export function recommendServicesForPurpose(
  purposeId: string,
  services: EnrichedService[],
  fields: ComparisonField[],
): PurposeRecommendResult {
  const trialField = findField(fields, [/trial|お試し|無料期間|free-trial/i]);
  const supportField = findField(fields, [/^support$/i, /^サポート$/]);
  const speedField = findField(fields, [/speed|速度|litespeed/i]);
  const storageTypeField = findField(fields, [/storage-type|SSD|NVMe/i]);
  const wpField = findField(fields, [/wordpress|ワードプレス/i]);
  const backupField = findField(fields, [/backup|バックアップ/i]);
  const phoneField = findField(fields, [/phone|電話/i]);
  const chatField = findField(fields, [/chat|チャット/i]);
  const emailField = findField(fields, [/email|メール/i]);
  const corporateField = findField(fields, [/corporate|法人/i]);

  let scored: Scored[] = [];

  switch (purposeId) {
    case "costperf":
    case "cheap": {
      scored = services.map((item) => {
        const price = planPrice(item);
        const fee = item.representativePlan?.initial_fee ?? null;
        const hasData = price != null;
        // 安いほど高スコア（負の価格）＋初期費用を軽く加味
        const score =
          (price == null ? -1e9 : -price) + (fee == null ? 0 : -fee * 0.05);
        return {
          item,
          score,
          hasData,
          reason: "月額料金を抑えやすいプランを優先しています。",
          metrics: [
            { label: "月額", value: formatPriceYen(price) },
            { label: "初期費用", value: formatPriceYen(fee) },
          ],
        };
      });
      break;
    }
    case "speed": {
      scored = services.map((item) => {
        const speed = fieldNumber(item, speedField);
        const storageText = fieldText(item, storageTypeField) ?? "";
        const nvme = /nvme/i.test(storageText) ? 2 : 0;
        const ssd = /ssd/i.test(storageText) ? 1 : 0;
        const keyword = hasKeyword(item, ["速度", "高速", "LiteSpeed"]) ? 1 : 0;
        const hasData = speed != null || nvme > 0 || ssd > 0 || keyword > 0;
        const score = (speed ?? 0) * 10 + nvme * 3 + ssd + keyword;
        return {
          item,
          score,
          hasData,
          reason: "表示速度・ストレージ性能を重視して選定しています。",
          metrics: [
            {
              label: "速度",
              value: speed != null ? String(speed) : "-",
            },
            {
              label: "ストレージ",
              value: storageText || "-",
            },
          ],
        };
      });
      break;
    }
    case "beginner": {
      scored = services.map((item) => {
        const beginner = hasKeyword(item, ["初心者", "初めて", "かんたん", "簡単"]);
        const wp = fieldNumber(item, wpField);
        const support = fieldNumber(item, supportField);
        const supportText = fieldText(item, supportField);
        const hasData = beginner || wp != null || support != null || Boolean(supportText);
        const score =
          (beginner ? 5 : 0) +
          (wp ? 3 : 0) +
          (support ?? 0) +
          (supportText ? 1 : 0) +
          (item.service.editor_score ?? 0);
        return {
          item,
          score,
          hasData,
          reason: "初心者向けの使いやすさ・サポートを重視しています。",
          metrics: [
            {
              label: "WordPress",
              value: wp != null ? (wp > 0 ? "対応" : "—") : "-",
            },
            {
              label: "サポート",
              value: supportText ?? (support != null ? String(support) : "要問い合わせ"),
            },
          ],
        };
      });
      break;
    }
    case "business": {
      scored = services.map((item) => {
        const corp =
          fieldNumber(item, corporateField) ??
          (hasKeyword(item, ["法人", "ビジネス", "企業"]) ? 1 : 0);
        const backup = fieldNumber(item, backupField);
        const support = fieldNumber(item, supportField);
        const hasData =
          corp > 0 || backup != null || support != null || item.service.editor_score != null;
        const score =
          corp * 5 +
          (backup ?? 0) * 2 +
          (support ?? 0) +
          (item.service.editor_score ?? 0);
        return {
          item,
          score,
          hasData: Boolean(hasData),
          reason: "法人利用・バックアップ・サポートを総合して選定しています。",
          metrics: [
            {
              label: "法人向け",
              value: corp > 0 ? "対応" : "-",
            },
            {
              label: "バックアップ",
              value: fieldText(item, backupField) ?? "-",
            },
          ],
        };
      });
      break;
    }
    case "blog":
    case "wordpress": {
      scored = services.map((item) => {
        const wp = fieldNumber(item, wpField);
        const wpText = fieldText(item, wpField);
        const keyword = hasKeyword(item, ["WordPress", "ワードプレス", "WP"]);
        const speed = fieldNumber(item, speedField);
        const hasData = wp != null || Boolean(wpText) || keyword;
        const score =
          (wp ?? (wpText || keyword ? 1 : 0)) * 5 +
          (speed ?? 0) +
          (keyword ? 2 : 0);
        return {
          item,
          score,
          hasData,
          reason: "WordPressの始めやすさと運用しやすさを重視しています。",
          metrics: [
            {
              label: "WordPress",
              value: wpText ?? (wp != null ? (wp > 0 ? "対応" : "—") : "-"),
            },
            {
              label: "月額",
              value: formatPriceYen(planPrice(item)),
            },
          ],
        };
      });
      break;
    }
    case "storage": {
      scored = services.map((item) => {
        const storage = item.representativePlan?.storage_value ?? null;
        const unit = item.representativePlan?.storage_unit ?? "GB";
        const hasData = storage != null;
        return {
          item,
          score: storage ?? -1,
          hasData,
          reason: "容量が大きいプランを優先しています。",
          metrics: [
            {
              label: "容量",
              value: storage != null ? `${storage}${unit}` : "-",
            },
            {
              label: "月額",
              value: formatPriceYen(planPrice(item)),
            },
          ],
        };
      });
      break;
    }
    case "support": {
      scored = services.map((item) => {
        const phone = fieldNumber(item, phoneField);
        const chat = fieldNumber(item, chatField);
        const email = fieldNumber(item, emailField);
        const support = fieldNumber(item, supportField);
        const supportText = fieldText(item, supportField);
        const channels =
          (phone ? 2 : 0) + (chat ? 2 : 0) + (email ? 1 : 0) + (supportText ? 1 : 0);
        const hasData = channels > 0 || support != null;
        const score = channels * 3 + (support ?? 0) * 2;
        return {
          item,
          score,
          hasData,
          reason: "電話・チャットなどサポート手段の充実度で選定しています。",
          metrics: [
            {
              label: "サポート",
              value: supportText ?? (support != null ? String(support) : "要問い合わせ"),
            },
            {
              label: "電話",
              value: phone ? "対応" : "-",
            },
          ],
        };
      });
      break;
    }
    case "multi": {
      scored = services.map((item) => {
        const keyword = hasKeyword(item, ["複数", "マルチ", "サイト数"]);
        const storage = item.representativePlan?.storage_value ?? null;
        const hasData = keyword || storage != null;
        const score = (keyword ? 5 : 0) + (storage ?? 0) / 100;
        return {
          item,
          score,
          hasData,
          reason: "複数サイト運営に向いた容量・用途タグを重視しています。",
          metrics: [
            {
              label: "容量",
              value:
                storage != null
                  ? `${storage}${item.representativePlan?.storage_unit ?? "GB"}`
                  : "-",
            },
            {
              label: "月額",
              value: formatPriceYen(planPrice(item)),
            },
          ],
        };
      });
      break;
    }
    default: {
      // 無料お試し等の拡張用: trial 長め
      if (purposeId === "trial" || purposeId === "free-trial") {
        scored = services.map((item) => {
          const days = fieldNumber(item, trialField);
          const hasData = days != null && days > 0;
          return {
            item,
            score: days ?? -1,
            hasData,
            reason: "無料お試し期間が長いサービスを優先しています。",
            metrics: [
              {
                label: "無料期間",
                value: days != null ? `${days}日` : "無料期間なし",
              },
              {
                label: "月額",
                value: formatPriceYen(planPrice(item)),
              },
            ],
          };
        });
      } else {
        scored = services.map((item) => ({
          item,
          score: item.service.editor_score ?? 0,
          hasData: item.service.editor_score != null || item.service.is_featured,
          reason: "総合評価をもとに選定しています。",
          metrics: [
            {
              label: "総合評価",
              value:
                item.service.editor_score != null
                  ? String(item.service.editor_score)
                  : "-",
            },
          ],
        }));
      }
    }
  }

  return { purposeId, items: rank(scored, 3) };
}

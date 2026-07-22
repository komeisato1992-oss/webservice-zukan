import type { ScrapeDiffItem } from "@/lib/scraping/types";

/** Map scrape fieldKey → spreadsheet column key (for lock matching) */
const SCRAPE_TO_SHEET: Record<string, string> = {
  regular_monthly_price: "通常価格",
  campaign_monthly_price: "キャンペーン価格",
  effective_monthly_price: "月額料金",
  initial_fee: "初期費用",
  storage_value: "容量",
  storage_unit: "容量単位",
  billing_period: "契約期間",
  name: "プラン名",
  official_url: "公式URL",
  // legacy flat keys
  monthly_price: "通常価格",
  campaign_price: "キャンペーン価格",
  storage_amount: "容量",
  representative_plan: "プラン名",
  // support
  "phone-support": "電話サポート",
  "email-support": "メールサポート",
  "chat-support": "チャットサポート",
  "support-phone-hours": "電話対応時間",
  "support-email-hours": "メール対応時間",
  "support-chat-hours": "チャット対応時間",
  "support-phone-conditions": "電話利用条件",
  "support-chat-type": "チャット種別",
  "support-24h-reception": "24時間受付",
  "support-24h": "24時間対応",
  "support-weekends": "土日祝対応",
  "support-source-url": "サポート出典URL",
  "support-checked-at": "最終確認日",
  "support-notes": "サポート備考",
};

/**
 * Mark scrape diff items as non-selectable when manual_override is on.
 * Candidates remain visible for review.
 */
export function applyManualLocksToScrapeDiffs(
  diffs: ScrapeDiffItem[],
  lockedFields: Set<string>,
): ScrapeDiffItem[] {
  if (lockedFields.size === 0) return diffs;

  return diffs.map((d) => {
    const sheetKey = SCRAPE_TO_SHEET[d.fieldKey] ?? d.fieldKey;
    const cmpKey = `cmp_${d.fieldKey}`;
    const locked =
      lockedFields.has(d.fieldKey) ||
      lockedFields.has(sheetKey) ||
      lockedFields.has(cmpKey);

    if (!locked) return d;

    return {
      ...d,
      selectable: false,
      warning: [d.warning, "手動ロック中のため自動反映できません"]
        .filter(Boolean)
        .join(" / "),
    };
  });
}

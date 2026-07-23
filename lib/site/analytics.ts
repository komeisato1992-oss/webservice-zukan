"use client";

import { sendGAEvent } from "@next/third-parties/google";

/**
 * GA4 affiliate_click パラメータ。
 * ranking_type / position はランキング文脈でのみ付与する。
 */
export type AffiliateClickParams = {
  service_name: string;
  page_type: string;
  button_location: string;
  ranking_type?: string;
  position?: number;
};

/**
 * 公式サイトへのアフィリエイトリンククリック計測。
 * 既存の @next/third-parties GoogleAnalytics（gtag / sendGAEvent）を利用する。
 */
export function trackAffiliateClick(params: AffiliateClickParams): void {
  if (typeof window === "undefined") return;

  const payload: Record<string, string | number> = {
    service_name: params.service_name,
    page_type: params.page_type,
    button_location: params.button_location,
  };
  if (params.ranking_type) {
    payload.ranking_type = params.ranking_type;
  }
  if (params.position != null && !Number.isNaN(params.position)) {
    payload.position = params.position;
  }

  try {
    sendGAEvent("event", "affiliate_click", payload);
  } catch {
    // GA 未初期化時は無視
  }
}

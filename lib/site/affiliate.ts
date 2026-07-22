/**
 * サービス単位のアフィリエイト設定（手入力。スクレイピングでは更新しない）。
 */
export const AFFILIATE_NETWORK_OPTIONS = [
  "A8",
  "もしも",
  "バリューコマース",
  "afb",
  "アクセストレード",
  "その他",
] as const;

export type AffiliateNetwork = (typeof AFFILIATE_NETWORK_OPTIONS)[number];

export const AFFILIATE_STATUS_OPTIONS = [
  { value: "active", label: "提携済" },
  { value: "pending", label: "申請中" },
  { value: "inactive", label: "未提携" },
] as const;

export type AffiliateStatus = (typeof AFFILIATE_STATUS_OPTIONS)[number]["value"];

export const AFFILIATE_STATUS_LABELS: Record<AffiliateStatus, string> = {
  active: "提携済",
  pending: "申請中",
  inactive: "未提携",
};

export function isAffiliateNetwork(
  value: string | null | undefined,
): value is AffiliateNetwork {
  return (
    typeof value === "string" &&
    (AFFILIATE_NETWORK_OPTIONS as readonly string[]).includes(value)
  );
}

export function normalizeAffiliateNetwork(
  value: string | null | undefined,
): AffiliateNetwork {
  return isAffiliateNetwork(value) ? value : "A8";
}

export function normalizeAffiliateStatus(
  value: string | null | undefined,
): AffiliateStatus {
  if (value === "active" || value === "pending" || value === "inactive") {
    return value;
  }
  // レガシー / シートの日本語表記
  if (value === "提携済" || value === "approved") return "active";
  if (value === "申請中") return "pending";
  if (value === "未提携" || value === "not_applied") return "inactive";
  return "inactive";
}

/** https:// のみ許可。空は null */
export function normalizeAffiliateUrl(
  value: string | null | undefined,
): string | null {
  const t = value?.trim() ?? "";
  if (!t) return null;
  if (!/^https:\/\//i.test(t)) {
    throw new Error("アフィリエイトURLは https:// から始めてください");
  }
  try {
    new URL(t);
  } catch {
    throw new Error("アフィリエイトURLの形式が正しくありません");
  }
  return t;
}

export function tryNormalizeAffiliateUrl(
  value: string | null | undefined,
): { ok: true; url: string | null } | { ok: false; message: string } {
  try {
    return { ok: true, url: normalizeAffiliateUrl(value) };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "アフィリエイトURLが不正です",
    };
  }
}

/** 一覧表示用（例: A8 / 申請中 / 未設定） */
export function formatAffiliateAspLabel(input: {
  affiliate_url?: string | null;
  affiliate_network?: string | null;
  affiliate_status?: string | null;
}): string {
  const url = input.affiliate_url?.trim();
  const network = normalizeAffiliateNetwork(input.affiliate_network);
  const status = normalizeAffiliateStatus(input.affiliate_status);
  if (!url && status === "inactive") return "未設定";
  if (!url) return `${network} · ${AFFILIATE_STATUS_LABELS[status]}`;
  return `${network} · ${AFFILIATE_STATUS_LABELS[status]}`;
}

/**
 * お問い合わせ送信の共通ロジック。
 * 現状は mailto。将来 Resend 等へ差し替えやすいよう入出力を分離している。
 */

export const CONTACT_TYPES = [
  { value: "correction", label: "掲載情報の修正依頼" },
  { value: "question", label: "サービスについての質問" },
  { value: "affiliate", label: "アフィリエイト・提携について" },
  { value: "other", label: "その他" },
] as const;

export type ContactType = (typeof CONTACT_TYPES)[number]["value"];

export type ContactPayload = {
  name: string;
  email: string;
  type: ContactType;
  message: string;
};

export type ContactValidationErrors = Partial<
  Record<keyof ContactPayload, string>
>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getContactEmail(): string {
  return (
    process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() ||
    "contact@example.com"
  );
}

export function validateContactPayload(
  payload: ContactPayload,
): ContactValidationErrors {
  const errors: ContactValidationErrors = {};

  if (!payload.name.trim()) {
    errors.name = "名前を入力してください";
  }
  if (!payload.email.trim()) {
    errors.email = "メールアドレスを入力してください";
  } else if (!EMAIL_RE.test(payload.email.trim())) {
    errors.email = "メールアドレスの形式が正しくありません";
  }
  if (!payload.type) {
    errors.type = "種別を選択してください";
  } else if (!CONTACT_TYPES.some((t) => t.value === payload.type)) {
    errors.type = "種別を選択してください";
  }
  if (!payload.message.trim()) {
    errors.message = "内容を入力してください";
  }

  return errors;
}

export function buildMailtoHref(payload: ContactPayload): string {
  const typeLabel =
    CONTACT_TYPES.find((t) => t.value === payload.type)?.label ?? payload.type;
  const subject = `【${typeLabel}】${payload.name}様よりお問い合わせ`;
  const body = [
    `お名前: ${payload.name}`,
    `メール: ${payload.email}`,
    `種別: ${typeLabel}`,
    "",
    "内容:",
    payload.message,
  ].join("\n");

  const params = new URLSearchParams({
    subject,
    body,
  });

  return `mailto:${getContactEmail()}?${params.toString()}`;
}

/**
 * 送信処理の差し替えポイント。
 * 将来 Resend 等へ切り替える場合はここを async API 呼び出しに変更する。
 */
export type ContactSubmitResult =
  | { ok: true; mode: "mailto"; href: string }
  | { ok: false; errors: ContactValidationErrors };

export function submitContact(payload: ContactPayload): ContactSubmitResult {
  const errors = validateContactPayload(payload);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    mode: "mailto",
    href: buildMailtoHref(payload),
  };
}

import type { ComparisonField, ComparisonValue } from "@/lib/types/database";
import type { EnrichedService } from "@/lib/site/service-utils";

/** comparison_fields.slug — support channel / metadata */
export const SUPPORT_FIELD_SLUGS = {
  composite: "support",
  phone: "phone-support",
  email: "email-support",
  chat: "chat-support",
  phoneHours: "support-phone-hours",
  emailHours: "support-email-hours",
  chatHours: "support-chat-hours",
  phoneConditions: "support-phone-conditions",
  chatType: "support-chat-type",
  reception24h: "support-24h-reception",
  support24h: "support-24h",
  weekends: "support-weekends",
  sourceUrl: "support-source-url",
  checkedAt: "support-checked-at",
  notes: "support-notes",
} as const;

/**
 * CMS seed / 旧マイグレーションで slug が揺れるため別名を吸収する。
 * 先頭が正規 slug。
 */
export const SUPPORT_FIELD_SLUG_ALIASES: Record<
  keyof typeof SUPPORT_FIELD_SLUGS,
  readonly string[]
> = {
  composite: ["support"],
  phone: ["phone-support", "support-phone"],
  email: ["email-support", "support-email"],
  chat: ["chat-support", "support-chat"],
  phoneHours: ["support-phone-hours"],
  emailHours: ["support-email-hours"],
  chatHours: ["support-chat-hours"],
  phoneConditions: ["support-phone-conditions"],
  chatType: ["support-chat-type"],
  reception24h: ["support-24h-reception"],
  support24h: ["support-24h"],
  weekends: ["support-weekends", "support-weekend"],
  sourceUrl: ["support-source-url"],
  checkedAt: ["support-checked-at"],
  notes: ["support-notes"],
};

export type SupportChannel = "phone" | "email" | "chat";

export type SupportChannels = {
  phone: boolean | null;
  email: boolean | null;
  chat: boolean | null;
};

export type SupportDetail = SupportChannels & {
  phoneHours: string | null;
  emailHours: string | null;
  chatHours: string | null;
  phoneConditions: string | null;
  chatType: string | null;
  reception24h: boolean | null;
  support24h: boolean | null;
  weekends: boolean | null;
  sourceUrl: string | null;
  checkedAt: string | null;
  notes: string | null;
  /** composite text_value fallback (e.g. メールフォームのみ) */
  compositeNote: string | null;
};

const CHANNEL_LABEL: Record<SupportChannel, string> = {
  phone: "電話",
  email: "メール",
  chat: "チャット",
};

const CHAT_TYPE_LABEL: Record<string, string> = {
  human: "有人",
  chatbot: "チャットボット",
  mixed: "有人 / ボット",
};

function boolFromAliases(
  item: EnrichedService,
  fields: ComparisonField[],
  slugs: readonly string[],
): boolean | null {
  // 別名が両方ある場合は true を優先、次に false、どちらも無ければ null
  let seenFalse = false;
  for (const slug of slugs) {
    const field = fields.find((f) => f.slug === slug);
    if (!field) continue;
    const value = item.comparisonByFieldId[field.id];
    if (!value || value.boolean_value == null) continue;
    if (value.boolean_value === true) return true;
    seenFalse = true;
  }
  return seenFalse ? false : null;
}

function textFromAliases(
  item: EnrichedService,
  fields: ComparisonField[],
  slugs: readonly string[],
): string | null {
  for (const slug of slugs) {
    const field = fields.find((f) => f.slug === slug);
    if (!field) continue;
    const t = item.comparisonByFieldId[field.id]?.text_value?.trim();
    if (t) return t;
  }
  return null;
}

export function readSupportDetail(
  item: EnrichedService,
  fields: ComparisonField[],
): SupportDetail {
  return {
    phone: boolFromAliases(item, fields, SUPPORT_FIELD_SLUG_ALIASES.phone),
    email: boolFromAliases(item, fields, SUPPORT_FIELD_SLUG_ALIASES.email),
    chat: boolFromAliases(item, fields, SUPPORT_FIELD_SLUG_ALIASES.chat),
    phoneHours: textFromAliases(
      item,
      fields,
      SUPPORT_FIELD_SLUG_ALIASES.phoneHours,
    ),
    emailHours: textFromAliases(
      item,
      fields,
      SUPPORT_FIELD_SLUG_ALIASES.emailHours,
    ),
    chatHours: textFromAliases(
      item,
      fields,
      SUPPORT_FIELD_SLUG_ALIASES.chatHours,
    ),
    phoneConditions: textFromAliases(
      item,
      fields,
      SUPPORT_FIELD_SLUG_ALIASES.phoneConditions,
    ),
    chatType: textFromAliases(item, fields, SUPPORT_FIELD_SLUG_ALIASES.chatType),
    reception24h: boolFromAliases(
      item,
      fields,
      SUPPORT_FIELD_SLUG_ALIASES.reception24h,
    ),
    support24h: boolFromAliases(
      item,
      fields,
      SUPPORT_FIELD_SLUG_ALIASES.support24h,
    ),
    weekends: boolFromAliases(
      item,
      fields,
      SUPPORT_FIELD_SLUG_ALIASES.weekends,
    ),
    sourceUrl: textFromAliases(
      item,
      fields,
      SUPPORT_FIELD_SLUG_ALIASES.sourceUrl,
    ),
    checkedAt: textFromAliases(
      item,
      fields,
      SUPPORT_FIELD_SLUG_ALIASES.checkedAt,
    ),
    notes: textFromAliases(item, fields, SUPPORT_FIELD_SLUG_ALIASES.notes),
    compositeNote: textFromAliases(
      item,
      fields,
      SUPPORT_FIELD_SLUG_ALIASES.composite,
    ),
  };
}

export function availableChannels(detail: SupportChannels): SupportChannel[] {
  const out: SupportChannel[] = [];
  if (detail.phone === true) out.push("phone");
  if (detail.email === true) out.push("email");
  if (detail.chat === true) out.push("chat");
  return out;
}

export function allChannelsUnknown(detail: SupportChannels): boolean {
  return (
    detail.phone == null && detail.email == null && detail.chat == null
  );
}

export function allChannelsFalse(detail: SupportChannels): boolean {
  return (
    detail.phone === false &&
    detail.email === false &&
    detail.chat === false
  );
}

/**
 * TOP 比較表向けの簡潔表示。
 * true の手段のみ「電話・メール・チャット」形式。false / 未確認は出さない。
 */
export function formatSupportCompact(detail: SupportDetail): {
  text: string;
  raw: number | string | null;
} {
  const available = availableChannels(detail);
  if (available.length > 0) {
    return {
      text: available.map((c) => CHANNEL_LABEL[c]).join("・"),
      raw: available.length,
    };
  }
  return { text: "-", raw: null };
}

/**
 * 比較ページ向けの詳細テキスト（複数行）。
 */
export function formatSupportDetailed(detail: SupportDetail): {
  text: string;
  raw: number | string | null;
} {
  const lines: string[] = [];
  const available = availableChannels(detail);

  if (available.length > 0) {
    for (const c of available) {
      lines.push(`${CHANNEL_LABEL[c]} ○`);
    }
  } else if (allChannelsUnknown(detail)) {
    return { text: "-", raw: null };
  } else if (allChannelsFalse(detail)) {
    const fallback =
      detail.compositeNote?.trim() ||
      detail.notes?.trim() ||
      "要問い合わせ";
    return { text: fallback, raw: 0 };
  } else {
    lines.push("-");
  }

  const hours: string[] = [];
  if (detail.phoneHours) hours.push(`電話: ${detail.phoneHours}`);
  if (detail.emailHours) hours.push(`メール: ${detail.emailHours}`);
  if (detail.chatHours) hours.push(`チャット: ${detail.chatHours}`);
  if (hours.length) {
    lines.push(`対応時間 ${hours.join(" / ")}`);
  }

  if (detail.support24h === true) lines.push("24時間対応 ○");
  else if (detail.reception24h === true) lines.push("24時間受付 ○");

  if (detail.weekends === true) lines.push("土日祝対応 ○");
  else if (detail.weekends === false) lines.push("土日祝: 非対応");

  if (detail.chatType) {
    lines.push(
      `チャット: ${CHAT_TYPE_LABEL[detail.chatType] ?? detail.chatType}`,
    );
  }
  if (detail.phoneConditions) {
    lines.push(`条件: ${detail.phoneConditions}`);
  }
  if (detail.notes) {
    lines.push(detail.notes);
  }

  return {
    text: lines.join("\n"),
    raw: available.length > 0 ? available.length : null,
  };
}

export function isSupportCompositeField(
  field: Pick<ComparisonField, "slug" | "name">,
): boolean {
  if (isSupportChannelField(field)) return false;
  return (
    field.slug === SUPPORT_FIELD_SLUGS.composite || field.name === "サポート"
  );
}

/** 電話・メール・チャット個別項目（複合サポート行に含める） */
export function isSupportChannelField(
  field: Pick<ComparisonField, "slug" | "name">,
): boolean {
  return /^(phone-support|email-support|chat-support|support-phone|support-email|support-chat)$/.test(
    field.slug,
  );
}

/** Spreadsheet Japanese header → comparison_fields.slug */
export const SUPPORT_SHEET_FIELDS: ReadonlyArray<{
  key: string;
  slug: string;
  kind: "boolean" | "string" | "url";
}> = [
  { key: "電話サポート", slug: SUPPORT_FIELD_SLUGS.phone, kind: "boolean" },
  { key: "メールサポート", slug: SUPPORT_FIELD_SLUGS.email, kind: "boolean" },
  { key: "チャットサポート", slug: SUPPORT_FIELD_SLUGS.chat, kind: "boolean" },
  {
    key: "電話対応時間",
    slug: SUPPORT_FIELD_SLUGS.phoneHours,
    kind: "string",
  },
  {
    key: "メール対応時間",
    slug: SUPPORT_FIELD_SLUGS.emailHours,
    kind: "string",
  },
  {
    key: "チャット対応時間",
    slug: SUPPORT_FIELD_SLUGS.chatHours,
    kind: "string",
  },
  {
    key: "電話利用条件",
    slug: SUPPORT_FIELD_SLUGS.phoneConditions,
    kind: "string",
  },
  { key: "チャット種別", slug: SUPPORT_FIELD_SLUGS.chatType, kind: "string" },
  {
    key: "24時間受付",
    slug: SUPPORT_FIELD_SLUGS.reception24h,
    kind: "boolean",
  },
  { key: "24時間対応", slug: SUPPORT_FIELD_SLUGS.support24h, kind: "boolean" },
  { key: "土日祝対応", slug: SUPPORT_FIELD_SLUGS.weekends, kind: "boolean" },
  {
    key: "サポート出典URL",
    slug: SUPPORT_FIELD_SLUGS.sourceUrl,
    kind: "url",
  },
  {
    key: "最終確認日",
    slug: SUPPORT_FIELD_SLUGS.checkedAt,
    kind: "string",
  },
  { key: "サポート備考", slug: SUPPORT_FIELD_SLUGS.notes, kind: "string" },
];

export function supportValueFromComparison(
  fieldType: ComparisonField["field_type"],
  value: ComparisonValue | null | undefined,
): string | boolean | null {
  if (!value) return null;
  if (fieldType === "boolean") {
    return value.boolean_value;
  }
  return value.text_value?.trim() || null;
}

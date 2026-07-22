import { SUPPORT_FIELD_SLUGS } from "@/lib/site/support";
import {
  createEmptyField,
  type ScrapeConfidence,
  type ScrapedComparisonValue,
} from "@/lib/scraping/types";

export type SupportExtractResult = {
  phone: boolean | null;
  email: boolean | null;
  chat: boolean | null;
  contactForm: boolean | null;
  phoneHours: string | null;
  emailHours: string | null;
  chatHours: string | null;
  phoneConditions: string | null;
  chatType: "human" | "chatbot" | "mixed" | null;
  reception24h: boolean | null;
  support24h: boolean | null;
  weekends: boolean | null;
  evidence: Partial<Record<string, string>>;
  confidence: ScrapeConfidence;
};

const NEGATION =
  /受け付けていません|受付していません|受け付けません|対応していません|対応しません|ありません|ございません|実施していません|提供していません|用意していません|非対応|不可|なし|無し|行っていません|おこなっていません/;

const HOURS_RE =
  /((?:平日|土日祝?|毎日|月曜から金曜|年中無休)?\s*(?:\d{1,2}[:：]\d{2}|\d{1,2}時)\s*[〜~\-－–]\s*(?:\d{1,2}[:：]\d{2}|\d{1,2}時)(?:\s*まで)?)/;

function clipEvidence(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function nearbyWindow(text: string, index: number, radius = 80): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end);
}

/** マッチ直後の同一文脈（句点まで）を優先して見る */
function clauseAround(text: string, index: number, matchLen: number): string {
  const before = text.slice(Math.max(0, index - 20), index);
  const afterStart = index;
  const afterEnd = Math.min(text.length, index + matchLen + 100);
  let after = text.slice(afterStart, afterEnd);
  const stop = after.search(/[。．\n]/);
  if (stop >= 0) after = after.slice(0, stop + 1);
  return `${before}${after}`.replace(/\s+/g, " ").trim();
}

/**
 * 否定・条件付きを考慮したサポート有無判定。
 * 曖昧な場合は null（未確認）を返す。
 */
function detectChannel(
  text: string,
  channelPatterns: RegExp[],
): {
  value: boolean | null;
  evidence: string | null;
  conditions: string | null;
} {
  let foundPositive: string | null = null;
  let foundNegative: string | null = null;
  let conditions: string | null = null;

  for (const re of channelPatterns) {
    const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
    const global = new RegExp(re.source, flags);
    let m: RegExpExecArray | null;
    while ((m = global.exec(text)) != null) {
      const clause = clauseAround(text, m.index, m[0].length);
      // キーワードより後ろ（または直前20文字）に否定があるか
      const afterKeyword = clause.slice(Math.max(0, clause.indexOf(m[0])));
      const negated =
        NEGATION.test(afterKeyword) ||
        new RegExp(
          `${m[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.{0,40}${NEGATION.source}`,
        ).test(clause);

      if (negated) {
        foundNegative = clipEvidence(clause);
        continue;
      }
      // 条件付きは true + conditions
      const condMatch = clause.match(
        /(?:ただし|なお)?(.{0,40}?(?:法人|有料|スタンダード以上|上位プラン|契約者|会員|プラン限定|対象).{0,40})/,
      );
      if (
        /のみ|限定|対象|以上で|プランで/.test(clause) &&
        condMatch?.[1]
      ) {
        conditions = clipEvidence(condMatch[1].trim(), 80);
      }
      foundPositive = clipEvidence(clause);
    }
  }

  // 同一チャネルで肯定があれば肯定優先（条件付き含む）
  if (foundPositive) {
    return { value: true, evidence: foundPositive, conditions };
  }
  if (foundNegative) {
    return { value: false, evidence: foundNegative, conditions: null };
  }

  return { value: null, evidence: null, conditions: null };
}

function extractHoursNear(
  text: string,
  anchors: RegExp[],
): string | null {
  for (const re of anchors) {
    const m = text.match(re);
    if (!m || m.index == null) continue;
    const win = nearbyWindow(text, m.index, 120);
    const hours = win.match(HOURS_RE);
    if (hours?.[1]) return hours[1].replace(/\s+/g, "").trim();
  }
  return null;
}

function detectChatType(
  text: string,
): "human" | "chatbot" | "mixed" | null {
  const bot = /AIチャット|チャットボット|自動応答|ボット/.test(text);
  const human = /有人チャット|オペレーター|スタッフが対応|リアルタイムチャット/.test(
    text,
  );
  if (bot && human) return "mixed";
  if (bot) return "chatbot";
  if (human) return "human";
  if (/チャットサポート|ライブチャット|オンラインチャット/.test(text)) {
    return "human";
  }
  return null;
}

/**
 * 「受付24時間」と「対応24時間」を分離。
 * 返信保証のない受付のみを reception24h とする。
 */
function detect24h(text: string): {
  reception24h: boolean | null;
  support24h: boolean | null;
  evidence: string | null;
} {
  let reception24h: boolean | null = null;
  let support24h: boolean | null = null;
  let evidence: string | null = null;

  if (/24時間\s*対応|年中無休.*対応|いつでも対応/.test(text)) {
    // 「メールは24時間受付」だけの場合は対応としない
    if (/24時間\s*対応/.test(text) && !/24時間\s*受付/.test(text)) {
      support24h = true;
      evidence = clipEvidence(text.match(/.{0,30}24時間\s*対応.{0,30}/)?.[0] ?? "24時間対応");
    } else if (/サポート.?24時間対応|24時間サポート対応/.test(text)) {
      support24h = true;
      evidence = "24時間サポート対応";
    }
  }

  if (/24時間\s*受付|受付.?24時間|24時間.?お問い合わせ/.test(text)) {
    reception24h = true;
    evidence =
      evidence ??
      clipEvidence(
        text.match(/.{0,30}24時間\s*受付.{0,30}/)?.[0] ?? "24時間受付",
      );
    // 受付だけの記載では support24h を true にしない
  }

  return { reception24h, support24h, evidence };
}

function detectWeekends(text: string): boolean | null {
  if (/土日祝?(?:も)?対応|土日祝日対応|年中無休/.test(text)) return true;
  if (/土日祝?(?:は)?休み|平日のみ|土日祝除く|土・日・祝を除く/.test(text)) {
    return false;
  }
  return null;
}

export function extractSupportFromText(text: string): SupportExtractResult {
  const normalized = text.replace(/\u00a0/g, " ");

  const phone = detectChannel(normalized, [
    /電話サポート/g,
    /電話でのお問い合わせ/g,
    /お電話での(?:ご)?問い合わせ/g,
    /電話によるお問い合わせ/g,
    /コールセンター/g,
  ]);

  const email = detectChannel(normalized, [
    /メールサポート/g,
    /メールでのお問い合わせ/g,
    /メールによるお問い合わせ/g,
    /E-?mailサポート/gi,
  ]);

  const chat = detectChannel(normalized, [
    /チャットサポート/g,
    /ライブチャット/g,
    /オンラインチャット/g,
    /有人チャット/g,
    /AIチャット/g,
    /チャットボット/g,
  ]);

  let contactForm: boolean | null = null;
  if (/お問い合わせフォーム|お問合せフォーム|問い合わせフォーム/.test(normalized)) {
    if (
      !/お問い合わせフォームは.?ありません|フォームでのお問い合わせは受け付けていません/.test(
        normalized,
      )
    ) {
      contactForm = true;
    }
  }

  const phoneHours = extractHoursNear(normalized, [
    /電話サポート/,
    /電話でのお問い合わせ/,
    /お電話/,
  ]);
  const emailHours = extractHoursNear(normalized, [
    /メールサポート/,
    /メールでのお問い合わせ/,
  ]);
  const chatHours = extractHoursNear(normalized, [
    /チャットサポート/,
    /ライブチャット/,
    /有人チャット/,
  ]);

  const chatType = chat.value === true ? detectChatType(normalized) : null;
  const h24 = detect24h(normalized);
  const weekends = detectWeekends(normalized);

  const evidence: SupportExtractResult["evidence"] = {};
  if (phone.evidence) evidence.phone = phone.evidence;
  if (email.evidence) evidence.email = email.evidence;
  if (chat.evidence) evidence.chat = chat.evidence;
  if (h24.evidence) evidence.h24 = h24.evidence;

  const knownCount = [phone.value, email.value, chat.value].filter(
    (v) => v != null,
  ).length;
  const confidence: ScrapeConfidence =
    knownCount >= 2 ? "high" : knownCount === 1 ? "medium" : "low";

  return {
    phone: phone.value,
    email: email.value,
    chat: chat.value,
    contactForm,
    phoneHours,
    emailHours,
    chatHours,
    phoneConditions: phone.conditions,
    chatType,
    reception24h: h24.reception24h,
    support24h: h24.support24h,
    weekends,
    evidence,
    confidence,
  };
}

function boolCandidate(
  fieldSlug: string,
  label: string,
  value: boolean | null,
  sourceUrl: string,
  evidence: string | null | undefined,
  confidence: ScrapeConfidence,
): ScrapedComparisonValue | null {
  if (value == null) return null;
  return {
    ...createEmptyField<boolean>(fieldSlug, label, sourceUrl, {
      value,
      rawValue: evidence ?? (value ? "あり" : "なし"),
      sourceText: evidence ?? null,
      confidence,
      status: "found",
    }),
    fieldSlug,
  };
}

function textCandidate(
  fieldSlug: string,
  label: string,
  value: string | null,
  sourceUrl: string,
  confidence: ScrapeConfidence,
): ScrapedComparisonValue | null {
  if (!value?.trim()) return null;
  return {
    ...createEmptyField<string>(fieldSlug, label, sourceUrl, {
      value: value.trim(),
      rawValue: value.trim(),
      sourceText: value.trim(),
      confidence,
      status: "found",
    }),
    fieldSlug,
  };
}

/** SupportExtractResult → ScrapedComparisonValue[]（未確認は出さない） */
export function supportResultToComparisonValues(
  result: SupportExtractResult,
  sourceUrl: string,
  options?: { checkedAt?: string },
): ScrapedComparisonValue[] {
  const conf = result.confidence === "low" ? "medium" : result.confidence;
  const out: ScrapedComparisonValue[] = [];

  const push = (v: ScrapedComparisonValue | null) => {
    if (v) out.push(v);
  };

  push(
    boolCandidate(
      SUPPORT_FIELD_SLUGS.phone,
      "電話サポート",
      result.phone,
      sourceUrl,
      result.evidence.phone,
      conf,
    ),
  );
  push(
    boolCandidate(
      SUPPORT_FIELD_SLUGS.email,
      "メールサポート",
      result.email,
      sourceUrl,
      result.evidence.email,
      conf,
    ),
  );
  push(
    boolCandidate(
      SUPPORT_FIELD_SLUGS.chat,
      "チャットサポート",
      result.chat,
      sourceUrl,
      result.evidence.chat,
      conf,
    ),
  );
  push(
    textCandidate(
      SUPPORT_FIELD_SLUGS.phoneHours,
      "電話対応時間",
      result.phoneHours,
      sourceUrl,
      conf,
    ),
  );
  push(
    textCandidate(
      SUPPORT_FIELD_SLUGS.emailHours,
      "メール対応時間",
      result.emailHours,
      sourceUrl,
      conf,
    ),
  );
  push(
    textCandidate(
      SUPPORT_FIELD_SLUGS.chatHours,
      "チャット対応時間",
      result.chatHours,
      sourceUrl,
      conf,
    ),
  );
  push(
    textCandidate(
      SUPPORT_FIELD_SLUGS.phoneConditions,
      "電話利用条件",
      result.phoneConditions,
      sourceUrl,
      conf,
    ),
  );
  push(
    textCandidate(
      SUPPORT_FIELD_SLUGS.chatType,
      "チャット種別",
      result.chatType,
      sourceUrl,
      conf,
    ),
  );
  push(
    boolCandidate(
      SUPPORT_FIELD_SLUGS.reception24h,
      "24時間受付",
      result.reception24h,
      sourceUrl,
      result.evidence.h24,
      conf,
    ),
  );
  push(
    boolCandidate(
      SUPPORT_FIELD_SLUGS.support24h,
      "24時間対応",
      result.support24h,
      sourceUrl,
      result.evidence.h24,
      conf,
    ),
  );
  push(
    boolCandidate(
      SUPPORT_FIELD_SLUGS.weekends,
      "土日祝対応",
      result.weekends,
      sourceUrl,
      null,
      conf,
    ),
  );
  push(
    textCandidate(
      SUPPORT_FIELD_SLUGS.sourceUrl,
      "サポート出典URL",
      sourceUrl,
      sourceUrl,
      conf,
    ),
  );
  if (options?.checkedAt) {
    push(
      textCandidate(
        SUPPORT_FIELD_SLUGS.checkedAt,
        "サポート最終確認日",
        options.checkedAt,
        sourceUrl,
        conf,
      ),
    );
  }

  // すべて false でフォームのみのとき備考候補
  if (
    result.phone === false &&
    result.email === false &&
    result.chat === false &&
    result.contactForm === true
  ) {
    push(
      textCandidate(
        SUPPORT_FIELD_SLUGS.notes,
        "サポート備考",
        "メールフォームのみ",
        sourceUrl,
        "medium",
      ),
    );
    push(
      textCandidate(
        SUPPORT_FIELD_SLUGS.composite,
        "サポート",
        "メールフォームのみ",
        sourceUrl,
        "medium",
      ),
    );
  }

  return out;
}

/**
 * 既存候補とサポート抽出結果をマージ。
 * 既存の found を優先し、欠けているサポート項目だけ補完する。
 */
export function mergeSupportComparisonValues(
  existing: ScrapedComparisonValue[],
  pageText: string,
  sourceUrl: string,
): ScrapedComparisonValue[] {
  if (!pageText.trim()) return existing;

  const extracted = extractSupportFromText(pageText);
  const candidates = supportResultToComparisonValues(extracted, sourceUrl, {
    checkedAt: new Date().toISOString().slice(0, 10),
  });

  const bySlug = new Map<string, ScrapedComparisonValue>();
  for (const item of existing) {
    bySlug.set(item.fieldSlug, item);
  }

  for (const cand of candidates) {
    const prev = bySlug.get(cand.fieldSlug);
    if (!prev) {
      bySlug.set(cand.fieldSlug, cand);
      continue;
    }
    // 既存が not_found / null なら置き換え
    if (
      prev.status === "not_found" ||
      prev.value == null ||
      prev.status === "error"
    ) {
      bySlug.set(cand.fieldSlug, cand);
      continue;
    }
    // 既存が肯定で抽出が否定、または逆 — 信頼度が高い方 / ambiguous
    if (
      typeof prev.value === "boolean" &&
      typeof cand.value === "boolean" &&
      prev.value !== cand.value
    ) {
      bySlug.set(cand.fieldSlug, {
        ...cand,
        status: "ambiguous",
        confidence: "low",
        warning: [
          prev.warning,
          cand.warning,
          `既存候補(${prev.value})と抽出(${cand.value})が不一致。根拠: ${cand.rawValue ?? ""}`,
        ]
          .filter(Boolean)
          .join(" / "),
        value: null,
      });
    }
  }

  return Array.from(bySlug.values());
}

/** pageData からテキストを集約 */
export function collectPageText(
  pageData: Record<string, unknown>,
): { text: string; sourceUrl: string | null } {
  const chunks: string[] = [];
  let sourceUrl: string | null = null;
  for (const value of Object.values(pageData)) {
    if (!value || typeof value !== "object") continue;
    const v = value as { pageText?: unknown; sourceUrl?: unknown };
    if (typeof v.pageText === "string" && v.pageText.trim()) {
      chunks.push(v.pageText);
    }
    if (!sourceUrl && typeof v.sourceUrl === "string") {
      sourceUrl = v.sourceUrl;
    }
  }
  return { text: chunks.join("\n"), sourceUrl };
}

/** 既存 comparisonValues の根拠テキストからも補完抽出 */
export function collectEvidenceText(
  comparisonValues: ScrapedComparisonValue[],
): string {
  return comparisonValues
    .map((c) => [c.sourceText, c.rawValue].filter(Boolean).join(" "))
    .join("\n");
}

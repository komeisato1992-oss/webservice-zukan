/**
 * サポート抽出ルールの単体確認（ネットワークなし）
 */
import { extractSupportFromText } from "../lib/scraping/support-extract";
import {
  formatSupportCompact,
  formatSupportDetailed,
} from "../lib/site/support";

const cases: Array<{ name: string; text: string }> = [
  {
    name: "否定・電話なし",
    text: "電話によるお問い合わせは受け付けていません。メールサポートは平日10:00〜18:00です。",
  },
  {
    name: "電話あり・条件付き",
    text: "電話サポートは法人プランのみ。平日10時〜18時。チャットサポート（有人チャット）あり。",
  },
  {
    name: "24時間受付と対応の区別",
    text: "メールは24時間受付。チャットボットでお問い合わせいただけます。",
  },
  {
    name: "全部なし＋フォーム",
    text: "電話サポートはありません。メールサポートはありません。チャットサポートはありません。お問い合わせフォームからご連絡ください。",
  },
];

for (const c of cases) {
  const r = extractSupportFromText(c.text);
  const compact = formatSupportCompact({
    phone: r.phone,
    email: r.email,
    chat: r.chat,
    phoneHours: r.phoneHours,
    emailHours: r.emailHours,
    chatHours: r.chatHours,
    phoneConditions: r.phoneConditions,
    chatType: r.chatType,
    reception24h: r.reception24h,
    support24h: r.support24h,
    weekends: r.weekends,
    sourceUrl: null,
    checkedAt: null,
    notes:
      r.phone === false && r.email === false && r.chat === false && r.contactForm
        ? "メールフォームのみ"
        : null,
    compositeNote: null,
  });
  const detailed = formatSupportDetailed({
    phone: r.phone,
    email: r.email,
    chat: r.chat,
    phoneHours: r.phoneHours,
    emailHours: r.emailHours,
    chatHours: r.chatHours,
    phoneConditions: r.phoneConditions,
    chatType: r.chatType,
    reception24h: r.reception24h,
    support24h: r.support24h,
    weekends: r.weekends,
    sourceUrl: null,
    checkedAt: null,
    notes: null,
    compositeNote: null,
  });
  console.log(
    JSON.stringify(
      {
        name: c.name,
        extract: {
          phone: r.phone,
          email: r.email,
          chat: r.chat,
          chatType: r.chatType,
          phoneConditions: r.phoneConditions,
          reception24h: r.reception24h,
          support24h: r.support24h,
          hours: {
            phone: r.phoneHours,
            email: r.emailHours,
            chat: r.chatHours,
          },
        },
        compact: compact.text,
        detailed: detailed.text,
      },
      null,
      2,
    ),
  );
}

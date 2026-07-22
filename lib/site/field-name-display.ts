/**
 * 比較項目名のスマホ短縮表示・改行位置を一元管理。
 * DB / 管理画面の正式名は変更しない（表示のみ）。
 */

export type FieldDisplayName = {
  match: RegExp;
  /** スマホ用短縮ラベル（意味は維持） */
  shortLabel: string;
  /** 単語単位の改行（最大2行） */
  lines: [string] | [string, string];
};

export const FIELD_DISPLAY_NAME_RULES: FieldDisplayName[] = [
  { match: /初期費用/, shortLabel: "初期費用", lines: ["初期費用"] },
  { match: /月額/, shortLabel: "月額料金", lines: ["月額料金"] },
  {
    match: /無料お試し|お試し期間|free-trial/i,
    shortLabel: "無料お試し期間",
    lines: ["無料お試し", "期間"],
  },
  {
    match: /キャンペーン/,
    shortLabel: "キャンペーン",
    lines: ["キャンペーン"],
  },
  // storage-type を先に判定（storage に誤マッチして「容量」になるのを防ぐ）
  {
    match: /ストレージ.?種類|storage-type|storage.?type/i,
    shortLabel: "ストレージ種類",
    lines: ["ストレージ", "種類"],
  },
  {
    match: /(^storage$)|(^|[\s])storage([\s]|$)|^容量$|容量(?!.*種類)/i,
    shortLabel: "容量",
    lines: ["容量"],
  },
  // 電話・メール・チャットを複合サポートより先に判定
  {
    match: /電話|phone-support|support-phone|(^|[\s/-])phone([\s/-]|$)|tel/i,
    shortLabel: "電話",
    lines: ["電話"],
  },
  {
    match: /メール|email-support|support-email|(^|[\s/-])email([\s/-]|$)|mail/i,
    shortLabel: "メール",
    lines: ["メール"],
  },
  {
    match: /チャット|chat-support|support-chat|(^|[\s/-])chat([\s/-]|$)/i,
    shortLabel: "チャット",
    lines: ["チャット"],
  },
  // 複合サポートのみ（support-phone 等は上で除外済み）
  {
    match: /(^support$)|サポート(?!詳細)|サポート$/i,
    shortLabel: "サポート",
    lines: ["サポート"],
  },
  {
    match: /^ssd$|nvme/i,
    shortLabel: "ストレージ",
    lines: ["ストレージ"],
  },
  {
    match: /簡単インストール|wordpress.?install|wp.?install/i,
    shortLabel: "簡単導入",
    lines: ["簡単導入"],
  },
  {
    match: /簡単移行|wordpress.?migrat|wp.?migrat/i,
    shortLabel: "簡単移行",
    lines: ["簡単移行"],
  },
  {
    match: /バックアップ|backup/i,
    shortLabel: "バックアップ",
    lines: ["バックアップ"],
  },
  {
    match: /無料ssl|free.?ssl|ssl/i,
    shortLabel: "無料SSL",
    lines: ["無料SSL"],
  },
  {
    match: /転送量|transfer/i,
    shortLabel: "転送量",
    lines: ["転送量"],
  },
  {
    match: /総合評価|editor.?score/i,
    shortLabel: "総合評価",
    lines: ["総合評価"],
  },
];

export function resolveFieldNameDisplay(
  name: string,
  slug?: string | null,
): { shortLabel: string; lines: string[] } {
  const key = `${slug ?? ""} ${name}`;
  for (const rule of FIELD_DISPLAY_NAME_RULES) {
    if (rule.match.test(key) || rule.match.test(name)) {
      return {
        shortLabel: rule.shortLabel,
        lines: rule.lines.slice(0, 2),
      };
    }
  }
  const trimmed = name.trim();
  if (trimmed.length <= 6) {
    return { shortLabel: trimmed, lines: [trimmed] };
  }
  // フォールバック: 既知以外は正式名を1行（CSSで無理に折り返さない）
  return { shortLabel: trimmed, lines: [trimmed] };
}

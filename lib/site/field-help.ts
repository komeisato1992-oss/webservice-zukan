/**
 * 比較項目・カテゴリの説明文。
 * field.description / 将来の管理画面値を優先し、未設定時のみフォールバック。
 */

export const COMPARE_GROUP_DESCRIPTIONS: Record<string, string> = {
  料金: "月額料金や初期費用など、料金に関する比較です。",
  "容量・性能": "ストレージ容量や表示速度など、性能に関する比較です。",
  WordPress: "WordPress運営に必要な機能です。",
  バックアップ: "自動バックアップや復元に関する比較です。",
  サポート: "電話・チャット・メールなどサポート体制の比較です。",
  セキュリティ: "SSLやセキュリティ対策に関する比較です。",
  会社情報: "運営会社や法人対応など、会社情報の比較です。",
  その他: "その他の比較項目です。",
};

/** slug / 名称キーワード → 初心者向けの短い説明 */
const FIELD_HELP_FALLBACKS: Array<{ match: RegExp; text: string }> = [
  {
    match: /litespeed|ライトスピード/i,
    text: "LiteSpeedとは高速なWebサーバーソフトウェアです。WordPress表示速度の向上が期待できます。",
  },
  {
    match: /free-ssl|無料ssl|ssl/i,
    text: "通信を暗号化する機能です。サイトの安全性向上やSEOにも役立ちます。",
  },
  {
    match: /wordpress|ワードプレス|wp/i,
    text: "WordPressを簡単に導入・運用できる機能です。初心者にも扱いやすい指標です。",
  },
  {
    match: /backup|バックアップ/,
    text: "データを自動で保存する機能です。トラブル時に復元できるかを確認しましょう。",
  },
  {
    match: /storage|容量/,
    text: "サイトやメールで使えるディスク容量です。画像や動画が多い場合は余裕を見て選びます。",
  },
  {
    match: /monthly|月額|料金/,
    text: "毎月かかる利用料金です。キャンペーン終了後の通常料金もあわせて確認しましょう。",
  },
  {
    match: /initial|初期/,
    text: "契約時に一度だけかかる費用です。無料キャンペーンの有無も確認してください。",
  },
  {
    match: /trial|お試し|無料期間/,
    text: "契約前に試せる無料期間です。操作感や速度を実際に確認したいときに便利です。",
  },
  {
    match: /support|サポート/,
    text: "困ったときの問い合わせ手段です。電話・チャット・メールの有無を確認しましょう。",
  },
  {
    match: /nvme|ssd/i,
    text: "データの読み書き速度に関わるストレージ種別です。NVMeやSSDは表示速度に有利です。",
  },
  {
    match: /transfer|転送/,
    text: "サイトへのアクセスで使える通信量の目安です。アクセスが多い場合に重要です。",
  },
];

export function resolveFieldHelpText(input: {
  name: string;
  slug?: string | null;
  description?: string | null;
}): string {
  const fromAdmin = input.description?.trim();
  if (fromAdmin) return fromAdmin;

  const key = `${input.slug ?? ""} ${input.name}`;
  for (const item of FIELD_HELP_FALLBACKS) {
    if (item.match.test(key)) return item.text;
  }
  return `${input.name}の比較項目です。各サービスの対応状況や数値を並べて確認できます。`;
}

export function resolveGroupDescription(group: string): string {
  return (
    COMPARE_GROUP_DESCRIPTIONS[group] ??
    `${group}に関する比較項目です。`
  );
}

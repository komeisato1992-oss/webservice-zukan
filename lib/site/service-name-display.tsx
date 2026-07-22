/**
 * サービス名の改行位置を一元管理。
 * 将来は管理画面 / DB の displayNameLines へ差し替えやすい形。
 */
export type ServiceDisplayName = {
  /** slug または名称マッチ */
  match: RegExp;
  /** 最大2行 */
  lines: [string] | [string, string];
};

export const SERVICE_DISPLAY_NAME_RULES: ServiceDisplayName[] = [
  { match: /エックス\s*サーバー|xserver/i, lines: ["エックス", "サーバー"] },
  { match: /さくらの\s*レンタル/, lines: ["さくらの", "レンタルサーバー"] },
  { match: /^さくら\s*VPS|sakura\s*vps/i, lines: ["さくら", "VPS"] },
  { match: /ロリポップ/, lines: ["ロリポップ！"] },
  { match: /conoha/i, lines: ["ConoHa", "WING"] },
  { match: /mixhost/i, lines: ["mixhost"] },
  { match: /シン\s*レンタル/, lines: ["シン", "レンタルサーバー"] },
  { match: /ラッコ/, lines: ["ラッコ", "サーバー"] },
  { match: /カゴヤ|kagoya/i, lines: ["カゴヤ", "レンタルサーバー"] },
  { match: /コア\s*サーバー|coreserver/i, lines: ["コア", "サーバー"] },
  { match: /ablenet/i, lines: ["ABLENET"] },
  { match: /colorfulbox/i, lines: ["ColorfulBox"] },
  { match: /xrea/i, lines: ["XREA"] },
  { match: /お名前/, lines: ["お名前.com", "レンタルサーバー"] },
  { match: /スター\s*サーバー|star.?server/i, lines: ["スター", "サーバー"] },
  { match: /ヘテムル|heteml/i, lines: ["ヘテムル"] },
  { match: /cpi/i, lines: ["CPI"] },
  { match: /zenlogic/i, lines: ["Zenlogic"] },
  { match: /iCLUSTA|アイクラスタ/i, lines: ["iCLUSTA"] },
  { match: /WebARENA|インディゴ/i, lines: ["WebARENA", "Indigo"] },
  { match: /Futoka|フトカ/i, lines: ["Futoka"] },
];

/** サービス名を単語単位の行配列へ（最大2行） */
export function resolveServiceNameLines(name: string): string[] {
  const trimmed = name.trim();
  for (const rule of SERVICE_DISPLAY_NAME_RULES) {
    if (rule.match.test(trimmed)) {
      return rule.lines.slice(0, 2);
    }
  }
  const parts = trimmed.split(/[\s・／/]+/).filter(Boolean);
  if (parts.length >= 2 && parts.every((p) => p.length >= 2)) {
    return parts.slice(0, 2);
  }
  return [trimmed];
}

/**
 * プラン名に「プラン」を付与（重複防止）。
 * 「スタンダード」→「スタンダードプラン」
 * 「スタンダードプラン」→そのまま
 * display_name があればそれを優先（同様に重複付与しない）
 */
export function formatPlanLabel(
  name: string | null | undefined,
  displayName?: string | null,
): string {
  const override = displayName?.trim();
  if (override) {
    if (/プラン\s*$/u.test(override)) return override.replace(/\s+$/u, "");
    return `${override}プラン`;
  }
  const t = name?.trim();
  if (!t) return "";
  if (/プラン\s*$/u.test(t)) return t.replace(/\s+$/u, "");
  return `${t}プラン`;
}

/** ServicePlan などから表示ラベルを組み立てる */
export function formatPlanLabelFromPlan(plan: {
  name?: string | null;
  display_name?: string | null;
} | null | undefined): string {
  if (!plan) return "";
  return formatPlanLabel(plan.name, plan.display_name);
}

/** 仕様書エイリアス */
export const formatPlanName = formatPlanLabel;

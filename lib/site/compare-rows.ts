import type { ComparisonField } from "@/lib/types/database";
import {
  formatComparisonDisplay,
  formatPrice,
  formatStorage,
  hasComparisonValue,
} from "@/lib/types/comparison";
import type { EnrichedService } from "@/lib/site/service-utils";
import {
  emptyDisplayForField,
  normalizeValueSource,
  resolveCompareRule,
  resolveComparePageFields,
  resolveTopFeaturedFields,
  resolveTopTableFields,
} from "@/lib/site/comparison-display";
import {
  formatBooleanValue,
  formatMonthlyPrice,
  formatSupportMethods,
  formatTrialPeriod,
  isCampaignField,
  isFreeTrialField,
  isStorageTypeField,
  resolveActiveCampaignText,
  resolveStorageTypeText,
  resolveTrialDays,
} from "@/lib/site/compare-formatters";
import {
  formatSupportDetailed,
  isSupportCompositeField,
  isSupportChannelField,
  readSupportDetail,
} from "@/lib/site/support";
import { applyCompareValueHighlights, storageToGb } from "@/lib/site/compare-highlight";

export type CompareBestKind = "min" | "max" | "true" | "score";

export type CompareCell = {
  text: string;
  raw: number | boolean | string | null;
  isBest: boolean;
  bestLabel: string | null;
  /** 月額料金の2行表示（通常＋キャンペーン） */
  priceDisplay?: {
    regularText: string;
    campaignText: string;
  } | null;
  /** boolean の ○ 強調 */
  isBooleanTrue?: boolean;
  /** 青文字＋太字（条件付き強調。⭐なしでも可） */
  emphasize?: boolean;
  /** @deprecated emphasize へ移行 */
  plainBold?: boolean;
};

export type CompareRow = {
  id: string;
  label: string;
  navLabel: string;
  bestLabel: string | null;
  kind: CompareBestKind | "text" | "action";
  cells: CompareCell[];
  /** 管理画面の説明（ヘルプ用） */
  description?: string | null;
  /** 管理画面のカテゴリ（比較ページの折りたたみ見出し） */
  displayGroup?: string | null;
  /** 管理画面の⭐強調項目 */
  isHighlighted?: boolean;
  fieldSlug?: string;
};

function findField(
  fields: ComparisonField[],
  patterns: RegExp[],
): ComparisonField | undefined {
  return fields.find(
    (f) =>
      patterns.some((p) => p.test(f.slug)) ||
      patterns.some((p) => p.test(f.name)),
  );
}

function storageTypeFlags(text: string | null | undefined): {
  ssd: boolean | null;
  nvme: boolean | null;
} {
  if (!text?.trim()) return { ssd: null, nvme: null };
  const t = text.toLowerCase();
  const nvme = /nvme/.test(t);
  const ssd = nvme || /\bssd\b/.test(t);
  return { ssd, nvme };
}

function markBest<
  T extends {
    text: string;
    raw: number | boolean | string | null;
    priceDisplay?: CompareCell["priceDisplay"];
    isBooleanTrue?: boolean;
  },
>(cells: T[], kind: CompareBestKind, bestLabel: string): CompareCell[] {
  const emptyTexts = new Set([
    "—",
    "-",
    "情報なし",
    "無料期間なし",
    "要問い合わせ",
    "なし",
  ]);
  const candidates = cells
    .map((c, i) => ({ ...c, i }))
    .filter(
      (c) => c.raw != null && c.raw !== "" && !emptyTexts.has(c.text),
    );
  if (candidates.length === 0) {
    return cells.map((c) => ({
      ...c,
      isBest: false,
      bestLabel: null,
      priceDisplay: c.priceDisplay ?? null,
      isBooleanTrue: c.isBooleanTrue,
    }));
  }

  const winning = new Set<number>();

  if (kind === "min") {
    const nums = candidates.filter((c) => typeof c.raw === "number");
    if (nums.length === 0) {
      return cells.map((c) => ({
        ...c,
        isBest: false,
        bestLabel: null,
        priceDisplay: c.priceDisplay ?? null,
        isBooleanTrue: c.isBooleanTrue,
      }));
    }
    const min = Math.min(...nums.map((c) => c.raw as number));
    for (const c of nums) if (c.raw === min) winning.add(c.i);
  } else if (kind === "max" || kind === "score") {
    const nums = candidates.filter((c) => typeof c.raw === "number");
    if (nums.length === 0) {
      return cells.map((c) => ({
        ...c,
        isBest: false,
        bestLabel: null,
        priceDisplay: c.priceDisplay ?? null,
        isBooleanTrue: c.isBooleanTrue,
      }));
    }
    const max = Math.max(...nums.map((c) => c.raw as number));
    for (const c of nums) if (c.raw === max) winning.add(c.i);
  } else if (kind === "true") {
    const trues = candidates.filter((c) => c.raw === true);
    const falses = candidates.filter((c) => c.raw === false);
    // 全員 true のときは差が出ないので強調しない
    if (trues.length === 0 || falses.length === 0) {
      return cells.map((c) => ({
        ...c,
        isBest: false,
        bestLabel: null,
        priceDisplay: c.priceDisplay ?? null,
        isBooleanTrue: c.isBooleanTrue,
      }));
    }
    for (const c of trues) winning.add(c.i);
  }

  if (winning.size === 0 || winning.size === cells.length) {
    return cells.map((c) => ({
      ...c,
      isBest: false,
      bestLabel: null,
      priceDisplay: c.priceDisplay ?? null,
      isBooleanTrue: c.isBooleanTrue,
    }));
  }

  return cells.map((c, i) => ({
    ...c,
    isBest: winning.has(i),
    bestLabel: winning.has(i) ? bestLabel : null,
    priceDisplay: c.priceDisplay ?? null,
    isBooleanTrue: c.isBooleanTrue,
  }));
}

function fieldCell(
  item: EnrichedService,
  field: ComparisonField,
  options?: {
    emptyLabel?: string;
    allFields?: ComparisonField[];
    supportMode?: "compact" | "detailed";
  },
): {
  text: string;
  raw: number | boolean | string | null;
  priceDisplay?: CompareCell["priceDisplay"];
  isBooleanTrue?: boolean;
  emphasize?: boolean;
  plainBold?: boolean;
} {
  const empty = options?.emptyLabel ?? "-";
  const source = normalizeValueSource(field.value_source);

  if (
    isSupportCompositeField(field) &&
    options?.allFields &&
    options.allFields.length > 0
  ) {
    const detail = readSupportDetail(item, options.allFields);
    return options.supportMode === "detailed"
      ? formatSupportDetailed(detail)
      : formatSupportMethods(detail, empty);
  }

  if (isFreeTrialField(field)) {
    const days = resolveTrialDays(item, field);
    return {
      text: formatTrialPeriod(days, empty),
      raw: days,
    };
  }

  if (isCampaignField(field)) {
    const fromCampaigns = resolveActiveCampaignText(item, empty);
    if (fromCampaigns.raw != null) return fromCampaigns;
    // service_campaigns が空のときのみ comparison_values テキストをフォールバック
    const legacy = item.comparisonByFieldId[field.id]?.text_value?.trim();
    if (legacy) return { text: legacy, raw: legacy };
    return { text: empty, raw: null };
  }

  if (isStorageTypeField(field)) {
    return resolveStorageTypeText(item, field, empty);
  }

  if (source === "plan_monthly_price" || field.slug === "monthly-price") {
    const parts = formatMonthlyPrice(item.representativePlan, empty);
    return {
      text: parts.text,
      raw: parts.raw,
      priceDisplay:
        parts.showStrike && parts.regularText && parts.emphasisText
          ? {
              regularText: parts.regularText,
              campaignText: parts.emphasisText,
            }
          : null,
    };
  }
  if (
    source === "plan_initial_fee" ||
    field.slug === "initial-fee" ||
    /初期費用/.test(field.name)
  ) {
    const fee = item.representativePlan?.initial_fee ?? null;
    if (fee == null) return { text: empty, raw: null };
    const n = Number(fee);
    return {
      text: formatPrice(n),
      raw: n,
      // 強調は applyCompareValueHighlights で付与
      emphasize: n === 0,
    };
  }
  if (source === "plan_storage" || field.slug === "storage") {
    const plan = item.representativePlan;
    if (!plan || plan.storage_value == null) {
      return { text: empty, raw: null };
    }
    const gb = storageToGb(plan.storage_value, plan.storage_unit);
    return {
      text: formatStorage(plan.storage_value, plan.storage_unit),
      raw: gb,
    };
  }

  const value = item.comparisonByFieldId[field.id] ?? null;
  if (!hasComparisonValue(field, value)) {
    return { text: empty, raw: null };
  }
  if (field.field_type === "boolean") {
    const bool = value?.boolean_value ?? null;
    return {
      text: formatBooleanValue(bool, empty),
      raw: bool,
      isBooleanTrue: bool === true,
    };
  }
  const text = formatComparisonDisplay(field, value);
  switch (field.field_type) {
    case "number":
    case "rating":
      return { text, raw: value?.number_value ?? null };
    default:
      return { text, raw: value?.text_value?.trim() ?? null };
  }
}

function bestLabelForRule(kind: CompareBestKind | "text"): string | null {
  switch (kind) {
    case "min":
      return "最安";
    case "max":
      return "最大";
    case "true":
      return "対応";
    case "score":
      return "高評価";
    default:
      return null;
  }
}

/**
 * 管理画面の表示設定に基づく比較行を組み立てる。
 */
export function buildRowsFromDisplayFields(
  services: EnrichedService[],
  displayFields: ComparisonField[],
  options?: {
    useEmptyLabels?: boolean;
    allFields?: ComparisonField[];
    supportMode?: "compact" | "detailed";
  },
): CompareRow[] {
  if (services.length === 0 || displayFields.length === 0) return [];
  const enableBest = services.length >= 2;
  const useEmpty = options?.useEmptyLabels ?? false;
  const allFields = options?.allFields ?? displayFields;
  const supportMode = options?.supportMode ?? "compact";

  return displayFields.map((field) => {
    const isInitialFeeField =
      normalizeValueSource(field.value_source) === "plan_initial_fee" ||
      field.slug === "initial-fee" ||
      /初期費用/.test(field.name);
    // 無料お試し・サポート・初期費用は⭐最安/最大の自動付与対象外
    // （初期費用¥0・お試し30日以上などは applyCompareValueHighlights で青太字）
    const disableBest =
      isFreeTrialField(field) ||
      isSupportCompositeField(field) ||
      isInitialFeeField ||
      isStorageTypeField(field);
    const kind = isInitialFeeField
      ? "min"
      : disableBest
        ? "text"
        : resolveCompareRule(field);
    const bestLabel =
      disableBest || isInitialFeeField ? null : bestLabelForRule(kind);
    const emptyLabel = useEmpty ? emptyDisplayForField(field) : "-";
    const base = services.map((s) =>
      fieldCell(s, field, {
        emptyLabel,
        allFields,
        supportMode,
      }),
    );
    const withBest =
      enableBest && !disableBest && kind !== "text" && bestLabel
        ? markBest(base, kind, bestLabel)
        : base.map((c) => ({
            ...c,
            isBest: false,
            bestLabel: null,
            priceDisplay: c.priceDisplay ?? null,
            isBooleanTrue: c.isBooleanTrue,
            emphasize: c.emphasize,
            plainBold: c.plainBold,
          }));

    const cells = applyCompareValueHighlights(field, withBest);

    return {
      id: field.slug,
      label: field.name,
      navLabel: field.name,
      bestLabel: enableBest && !disableBest ? bestLabel : null,
      kind,
      cells,
      description: field.description ?? null,
      displayGroup: field.display_group?.trim() || null,
      isHighlighted: Boolean(field.is_highlighted),
      fieldSlug: field.slug,
    };
  });
}

/**
 * TOP表向けに表示項目を整理。
 * - slug 重複排除
 * - サポート個別（電話/メール/チャット）は複合行に含めるため除外
 */
export function dedupeDisplayFields(
  fields: ComparisonField[],
): ComparisonField[] {
  const hasCompositeSupport = fields.some((f) => isSupportCompositeField(f));
  const seen = new Set<string>();
  const out: ComparisonField[] = [];
  for (const field of fields) {
    if (hasCompositeSupport && isSupportChannelField(field)) continue;
    const key = field.slug;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(field);
  }
  return out;
}

/** 行の raw 値でサービスを並び替え（高評価=最良が左） */
export function sortServicesByRow(
  services: EnrichedService[],
  row: CompareRow,
  direction: "best-first" | "worst-first",
): EnrichedService[] {
  const indexed = services.map((s, i) => ({
    s,
    cell: row.cells[i],
    i,
  }));

  const rank = (raw: number | boolean | string | null): number | null => {
    if (raw == null || raw === "") return null;
    if (typeof raw === "number") return raw;
    if (typeof raw === "boolean") return raw ? 1 : 0;
    return null;
  };

  indexed.sort((a, b) => {
    const ar = rank(a.cell?.raw ?? null);
    const br = rank(b.cell?.raw ?? null);
    if (ar == null && br == null) return a.i - b.i;
    if (ar == null) return 1;
    if (br == null) return -1;

    let cmp = ar - br;
    if (row.kind === "min") {
      // 安い方が高評価
      cmp = ar - br;
    } else if (row.kind === "max" || row.kind === "score" || row.kind === "true") {
      cmp = br - ar;
    }

    if (direction === "worst-first") cmp = -cmp;
    if (cmp !== 0) return cmp;
    return a.i - b.i;
  });

  return indexed.map((x) => x.s);
}

function bestMetaForField(field: ComparisonField): {
  kind: CompareBestKind | "text";
  label: string | null;
} {
  if (field.field_type === "boolean") {
    return { kind: "true", label: "対応" };
  }
  if (field.field_type === "rating") {
    return { kind: "score", label: "高評価" };
  }
  if (field.field_type === "number") {
    if (/retention|日数|保持|容量|転送|速度|score|評価/.test(field.slug + field.name)) {
      return { kind: "max", label: "最大" };
    }
    if (/price|料金|費用|fee|コスト/.test(field.slug + field.name)) {
      return { kind: "min", label: "最安" };
    }
    return { kind: "max", label: "最大" };
  }
  return { kind: "text", label: null };
}

/**
 * 比較表の行定義を組み立てる。
 * プラン固定項目 + 公開中の比較フィールド + 総合評価。
 * データが無い項目はスキップする（転送量など未登録フィールドは出さない）。
 */
export function buildCompareRows(
  services: EnrichedService[],
  fields: ComparisonField[],
): CompareRow[] {
  if (services.length === 0) return [];

  const enableBest = services.length >= 2;
  const rows: CompareRow[] = [];

  const pushNumeric = (
    id: string,
    label: string,
    navLabel: string,
    kind: CompareBestKind,
    bestLabel: string | null,
    get: (s: EnrichedService) => {
      text: string;
      raw: number | null;
      plainBold?: boolean;
    },
  ) => {
    const base = services.map(get);
    const cells =
      enableBest && bestLabel
        ? markBest(base, kind, bestLabel)
        : base.map((c) => ({
            ...c,
            isBest: false,
            bestLabel: null,
            plainBold: c.plainBold,
          }));
    if (cells.every((c) => c.raw == null)) return;
    rows.push({
      id,
      label,
      navLabel,
      bestLabel: enableBest ? bestLabel : null,
      kind,
      cells,
    });
  };

  const pushBoolLike = (
    id: string,
    label: string,
    navLabel: string,
    bestLabel: string,
    get: (s: EnrichedService) => {
      text: string;
      raw: boolean | null;
    },
  ) => {
    const base = services.map(get);
    const cells = enableBest
      ? markBest(base, "true", bestLabel)
      : base.map((c) => ({ ...c, isBest: false, bestLabel: null }));
    if (cells.every((c) => c.raw == null)) return;
    rows.push({
      id,
      label,
      navLabel,
      bestLabel: enableBest ? bestLabel : null,
      kind: "true",
      cells,
    });
  };

  const pushText = (
    id: string,
    label: string,
    navLabel: string,
    get: (s: EnrichedService) => string,
  ) => {
    const cells = services.map((s) => {
      const text = get(s);
      return { text, raw: text === "—" ? null : text, isBest: false, bestLabel: null };
    });
    if (cells.every((c) => c.raw == null)) return;
    rows.push({
      id,
      label,
      navLabel,
      bestLabel: null,
      kind: "text",
      cells,
    });
  };

  pushNumeric(
    "monthly-price",
    "月額料金",
    "月額料金",
    "min",
    "最安",
    (s) => {
      const parts = formatMonthlyPrice(s.representativePlan, "—");
      return {
        text: parts.text,
        raw: parts.raw,
      };
    },
  );

  pushNumeric(
    "initial-fee",
    "初期費用",
    "初期費用",
    "min",
    null,
    (s) => {
      const fee = s.representativePlan?.initial_fee ?? null;
      if (fee == null) return { text: "—", raw: null };
      const n = Number(fee);
      return {
        text: formatPrice(n),
        raw: n,
        emphasize: n === 0,
      };
    },
  );

  pushText("billing-period", "契約期間", "契約期間", (s) => {
    return s.representativePlan?.billing_period?.trim() || "—";
  });

  const storageTypeField = findField(fields, [
    /storage-type/i,
    /ストレージ/,
    /SSD/,
    /NVMe/,
  ]);

  if (storageTypeField) {
    pushBoolLike("ssd", "SSD", "SSD", "対応", (s) => {
      const value = s.comparisonByFieldId[storageTypeField.id];
      const text = value?.text_value ?? "";
      const { ssd } = storageTypeFlags(text);
      if (ssd == null) return { text: "—", raw: null };
      return { text: ssd ? "○" : "—", raw: ssd };
    });
    pushBoolLike("nvme", "NVMe", "NVMe", "対応", (s) => {
      const value = s.comparisonByFieldId[storageTypeField.id];
      const text = value?.text_value ?? "";
      const { nvme } = storageTypeFlags(text);
      if (nvme == null && !text.trim()) return { text: "—", raw: null };
      if (nvme == null) return { text: "—", raw: false };
      return { text: nvme ? "○" : "—", raw: nvme };
    });
  }

  pushNumeric(
    "storage",
    "容量",
    "容量",
    "max",
    "最大",
    (s) => {
      const plan = s.representativePlan;
      if (!plan || plan.storage_value == null) {
        return { text: "—", raw: null };
      }
      return {
        text: formatStorage(plan.storage_value, plan.storage_unit),
        raw: storageToGb(plan.storage_value, plan.storage_unit),
      };
    },
  );

  // 転送量など任意フィールド
  const transferField = findField(fields, [/transfer/i, /転送/]);
  const usedFieldIds = new Set<string>();
  if (storageTypeField) usedFieldIds.add(storageTypeField.id);
  if (transferField) usedFieldIds.add(transferField.id);

  const preferredOrder: Array<{ patterns: RegExp[]; id?: string }> = [
    { patterns: [/transfer/i, /転送/], id: "transfer" },
    { patterns: [/free-ssl/i, /ssl/i, /無料SSL/] },
    { patterns: [/automatic-backup/i, /auto-backup/i, /backup/i, /バックアップ/] },
    { patterns: [/backup-retention/i, /復元/, /保持/] },
    { patterns: [/wordpress/i, /ワードプレス/, /WP/] },
    { patterns: [/litespeed/i, /速度/, /表示速度/, /speed/i] },
    { patterns: [/^support$/i, /サポート(?!.*電話|.*メール|.*チャット)/] },
    { patterns: [/phone-support/i, /電話/] },
    { patterns: [/chat/i, /チャット/] },
    { patterns: [/email-support/i, /メール/] },
    { patterns: [/auto-renew|自動更新/] },
    { patterns: [/trial|お試し|無料期間/] },
    { patterns: [/corporate|法人/] },
  ];

  for (const pref of preferredOrder) {
    const field = findField(fields, pref.patterns);
    if (!field || usedFieldIds.has(field.id)) continue;
    usedFieldIds.add(field.id);
    const disableBest =
      isFreeTrialField(field) || isSupportCompositeField(field);
    const meta = disableBest
      ? { kind: "text" as const, label: null }
      : bestMetaForField(field);
    const base = services.map((s) => fieldCell(s, field));
    let cells: CompareCell[];
    if (enableBest && !disableBest && meta.kind !== "text" && meta.label) {
      cells = markBest(base, meta.kind, meta.label);
    } else {
      cells = base.map((c) => ({ ...c, isBest: false, bestLabel: null }));
    }
    // 主要項目は値が未登録でも行を残す（比較ツールとしての一覧性を優先）

    let label = field.name;
    let rowId = pref.id ?? field.slug;
    if (/backup-retention|保持|復元/.test(field.slug + field.name)) {
      label = field.name.includes("復元") ? field.name : "復元";
      rowId = "restore";
    } else if (/litespeed|速度|speed/i.test(field.slug + field.name)) {
      label = /速度|speed/i.test(field.name) ? field.name : "表示速度";
      rowId = "speed";
    } else if (/wordpress/i.test(field.slug + field.name)) {
      label = "WordPress";
      rowId = "wordpress";
    } else if (/phone/i.test(field.slug) || field.name.includes("電話")) {
      label = "電話";
      rowId = "phone";
    } else if (/email/i.test(field.slug) || field.name.includes("メール")) {
      label = "メール";
      rowId = "email";
    } else if (/chat/i.test(field.slug) || field.name.includes("チャット")) {
      label = "チャット";
      rowId = "chat";
    } else if (/free-ssl|ssl/i.test(field.slug) || field.name.includes("SSL")) {
      label = "無料SSL";
      rowId = "free-ssl";
    } else if (/backup/i.test(field.slug) || field.name.includes("バックアップ")) {
      label = "バックアップ";
      rowId = "backup";
    }

    rows.push({
      id: rowId,
      label,
      navLabel: label,
      bestLabel: enableBest ? meta.label : null,
      kind: meta.kind,
      cells,
    });
  }

  // 残り公開フィールド（重複除外）
  for (const field of fields) {
    if (usedFieldIds.has(field.id)) continue;
    usedFieldIds.add(field.id);
    const meta = bestMetaForField(field);
    const base = services.map((s) => fieldCell(s, field));
    const cells =
      enableBest && meta.kind !== "text" && meta.label
        ? markBest(base, meta.kind, meta.label)
        : base.map((c) => ({ ...c, isBest: false, bestLabel: null }));
    if (cells.every((c) => c.raw == null)) continue;
    rows.push({
      id: field.slug,
      label: field.name,
      navLabel: field.name,
      bestLabel: enableBest ? meta.label : null,
      kind: meta.kind,
      cells,
    });
  }

  pushNumeric(
    "editor-score",
    "総合評価",
    "総合評価",
    "score",
    "高評価",
    (s) => {
      const score = s.service.editor_score;
      return {
        text: score == null ? "—" : `${Number(score).toFixed(1)}`,
        raw: score,
      };
    },
  );

  // DB未登録でも主要行の枠は残す（データ投入後に自動で埋まる）
  const ensureEmpty = (
    id: string,
    label: string,
    bestLabel: string | null,
    kind: CompareRow["kind"] = "text",
  ) => {
    if (rows.some((r) => r.id === id)) return;
    rows.push({
      id,
      label,
      navLabel: label,
      bestLabel: enableBest ? bestLabel : null,
      kind,
      cells: services.map(() => ({
        text: "—",
        raw: null,
        isBest: false,
        bestLabel: null,
      })),
    });
  };

  ensureEmpty("ssd", "SSD", "対応", "true");
  ensureEmpty("nvme", "NVMe", "対応", "true");
  ensureEmpty("transfer", "転送量", "最大", "max");
  ensureEmpty("free-ssl", "無料SSL", "対応", "true");
  ensureEmpty("backup", "バックアップ", "対応", "true");
  ensureEmpty("restore", "復元", "最大", "max");
  ensureEmpty("wordpress", "WordPress", "対応", "true");
  ensureEmpty("speed", "表示速度", "対応", "true");
  ensureEmpty("support", "サポート", "充実", "true");
  ensureEmpty("phone", "電話", "対応", "true");
  ensureEmpty("chat", "チャット", "対応", "true");
  ensureEmpty("email", "メール", "対応", "true");
  ensureEmpty("auto-renew", "自動更新", "対応", "true");
  ensureEmpty("trial", "無料お試し", "対応", "true");
  ensureEmpty("corporate", "法人利用", "対応", "true");
  ensureEmpty("editor-score", "総合評価", "高評価", "score");

  return rows;
}

/** TOP「レンタルサーバーを比較」用（管理画面の表示設定に従う） */
export function buildPopularCompareRows(
  services: EnrichedService[],
  fields: ComparisonField[],
): CompareRow[] {
  const displayFields = dedupeDisplayFields(resolveTopTableFields(fields));
  return buildRowsFromDisplayFields(services, displayFields, {
    useEmptyLabels: true,
    allFields: fields,
    supportMode: "compact",
  });
}

/**
 * TOPヒーロー「人気3社の比較」用（管理画面で選んだ5項目）。
 */
export function buildHeroCompareRows(
  services: EnrichedService[],
  fields: ComparisonField[],
): CompareRow[] {
  const displayFields = dedupeDisplayFields(resolveTopFeaturedFields(fields));
  return buildRowsFromDisplayFields(services, displayFields, {
    useEmptyLabels: true,
    allFields: fields,
    supportMode: "compact",
  });
}

/**
 * 比較ページ用。
 * 管理画面の表示順・カテゴリ・公開設定に従う（項目名のコード固定はしない）。
 */
export function buildConfiguredCompareRows(
  services: EnrichedService[],
  fields: ComparisonField[],
): CompareRow[] {
  const ordered = resolveComparePageFields(fields);
  if (ordered.length === 0) return [];
  const withSupport = ensureSupportDetailRow(ordered, fields);
  return buildRowsFromDisplayFields(services, withSupport, {
    useEmptyLabels: false,
    allFields: fields,
    supportMode: "detailed",
  });
}

/** ⭐評価のあるサービスを左へ（同順位は元の並び＝管理画面順位を維持） */
export function sortServicesByBestInRow(
  services: EnrichedService[],
  row: CompareRow,
): EnrichedService[] {
  const indexed = services.map((s, i) => ({
    s,
    isBest: Boolean(row.cells[i]?.isBest),
    i,
  }));
  indexed.sort((a, b) => {
    if (a.isBest !== b.isBest) return a.isBest ? -1 : 1;
    return a.i - b.i;
  });
  return indexed.map((x) => x.s);
}

function ensureSupportDetailRow(
  ordered: ComparisonField[],
  allFields: ComparisonField[],
): ComparisonField[] {
  const support =
    allFields.find((f) => isSupportCompositeField(f)) ??
    ordered.find((f) => isSupportCompositeField(f));
  if (!support) return ordered;
  const withoutDup = ordered.filter((f) => !isSupportCompositeField(f));
  // 電話・メール・チャット個別は複合行に含めるため重複表示しない
  const filtered = withoutDup.filter((f) => !isSupportChannelField(f));
  // サポート詳細行を料金系の後あたりへ
  const insertAt = Math.min(5, filtered.length);
  return [
    ...filtered.slice(0, insertAt),
    support,
    ...filtered.slice(insertAt),
  ];
}

export function sortByEditorScore(services: EnrichedService[]): EnrichedService[] {
  return [...services].sort((a, b) => {
    const sa = a.service.editor_score;
    const sb = b.service.editor_score;
    if (sa != null && sb != null && sa !== sb) return sb - sa;
    if (sa != null && sb == null) return -1;
    if (sa == null && sb != null) return 1;
    if (a.service.is_featured !== b.service.is_featured) {
      return a.service.is_featured ? -1 : 1;
    }
    return a.service.display_order - b.service.display_order ||
      a.service.name.localeCompare(b.service.name, "ja");
  });
}

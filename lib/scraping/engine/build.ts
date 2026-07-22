import { normalize } from "@/lib/scraping/normalize";
import {
  findPeriodKey,
  parsePriceCell,
  periodMonthsFromLabel,
} from "@/lib/scraping/engine/price";
import type {
  ComparisonMapping,
  ExtractedCards,
  ExtractedMatrix,
  PlanFieldConfig,
  ScraperDefinition,
} from "@/lib/scraping/engine/types";
import { markFromCellText } from "@/lib/scraping/providers/helpers";
import {
  normalizePlanName,
  slugifyJaPlanName,
} from "@/lib/scraping/utils/text";
import {
  createEmptyField,
  type ScrapedComparisonValue,
  type ScrapedField,
  type ScrapedPlan,
} from "@/lib/scraping/types";

function findRow(
  rows: Record<string, string[]>,
  includes: string[],
): { label: string; values: string[] } | null {
  for (const [label, values] of Object.entries(rows)) {
    if (includes.every((k) => label.includes(k))) {
      return { label, values };
    }
  }
  for (const [label, values] of Object.entries(rows)) {
    if (includes.some((k) => label.includes(k))) {
      return { label, values };
    }
  }
  return null;
}

function isMatrix(data: unknown): data is ExtractedMatrix {
  return Boolean(
    data &&
      typeof data === "object" &&
      "planNames" in data &&
      "rows" in data,
  );
}

function isCards(data: unknown): data is ExtractedCards {
  return Boolean(
    data && typeof data === "object" && "cards" in data,
  );
}

export function pickPriceMatrix(
  pageData: Record<string, unknown>,
): ExtractedMatrix | null {
  for (const value of Object.values(pageData)) {
    if (isMatrix(value) && value.planNames.length > 0) return value;
  }
  for (const value of Object.values(pageData)) {
    if (isMatrix(value)) return value;
  }
  return null;
}

export function mergeMatrices(
  pageData: Record<string, unknown>,
): ExtractedMatrix | null {
  const matrices = Object.values(pageData).filter(isMatrix);
  if (matrices.length === 0) return null;
  const primary =
    matrices.find((m) => m.planNames.length > 0) ?? matrices[0];
  const rows: Record<string, string[]> = { ...primary.rows };
  const periodRows: Record<string, string[]> = { ...primary.periodRows };
  for (const m of matrices) {
    Object.assign(rows, m.rows);
    Object.assign(periodRows, m.periodRows);
  }
  return {
    planNames: primary.planNames,
    rows,
    periodRows,
    pageText: matrices.map((m) => m.pageText).join("\n"),
    sourceUrl: primary.sourceUrl,
  };
}

export function buildPlansFromMatrix(
  matrix: ExtractedMatrix,
  plan: PlanFieldConfig,
  sourceUrl: string,
): ScrapedPlan[] {
  const periodKey = findPeriodKey(
    matrix.periodRows,
    plan.periodHints,
    plan.periodFallbackHints,
  );
  const periodValues = periodKey ? matrix.periodRows[periodKey] : null;
  const months = periodMonthsFromLabel(periodKey);

  // If no period rows, try priceRowIncludes against rows
  let priceValues = periodValues;
  let priceLabel = periodKey;
  if (!priceValues && plan.priceRowIncludes?.length) {
    const row = findRow(matrix.rows, plan.priceRowIncludes);
    priceValues = row?.values ?? null;
    priceLabel = row?.label ?? null;
  }

  const disk = plan.diskIncludes
    ? findRow(matrix.rows, plan.diskIncludes)
    : findRow(matrix.rows, ["ディスク"]) ??
      findRow(matrix.rows, ["容量"]);
  const initial = plan.initialFeeIncludes
    ? findRow(matrix.rows, plan.initialFeeIncludes)
    : findRow(matrix.rows, ["初期費用"]);
  const cpuRow = findRow(matrix.rows, ["CPU", "cpu"]);
  const memoryRow =
    findRow(matrix.rows, ["メモリ"]) ?? findRow(matrix.rows, ["メモリー"]);
  const transferRow =
    findRow(matrix.rows, ["転送量"]) ??
    findRow(matrix.rows, ["トラフィック"]) ??
    findRow(matrix.rows, ["帯域"]);
  const storageTypeRow =
    findRow(matrix.rows, ["ストレージ"]) ??
    findRow(matrix.rows, ["SSD"]) ??
    findRow(matrix.rows, ["NVMe"]);
  const dbRow =
    findRow(matrix.rows, ["データベース"]) ?? findRow(matrix.rows, ["DB"]);
  const multiDomainRow =
    findRow(matrix.rows, ["マルチドメイン"]) ??
    findRow(matrix.rows, ["独自ドメイン"]);
  const freeDomainRow = findRow(matrix.rows, ["無料ドメイン"]);
  const trialRow =
    findRow(matrix.rows, ["無料お試し"]) ??
    findRow(matrix.rows, ["お試し期間"]) ??
    findRow(matrix.rows, ["トライアル"]);
  const minContractRow =
    findRow(matrix.rows, ["最低利用期間"]) ??
    findRow(matrix.rows, ["最低契約"]);

  const names =
    matrix.planNames.length > 0
      ? matrix.planNames
      : priceValues
        ? priceValues.map((_, i) => `プラン${i + 1}`)
        : [];

  function cellAt(
    row: { label: string; values: string[] } | null,
    index: number,
  ): string {
    if (!row) return "";
    return row.values[index] || row.values[0] || "";
  }

  function stringField(
    key: string,
    label: string,
    raw: string,
  ): ScrapedPlan["cpu"] {
    const trimmed = raw.trim();
    if (!trimmed) {
      return createEmptyField<string>(key, label, sourceUrl, {
        status: "not_found",
      });
    }
    return createEmptyField<string>(key, label, sourceUrl, {
      value: trimmed,
      rawValue: trimmed,
      confidence: "medium",
      status: "found",
    });
  }

  function countField(
    key: string,
    label: string,
    raw: string,
  ): ScrapedField<number> {
    const trimmed = raw.trim();
    if (!trimmed) {
      return createEmptyField<number>(key, label, sourceUrl, {
        status: "not_found",
      });
    }
    const n = normalize.yen(trimmed) ?? Number(trimmed.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(n)) {
      return createEmptyField<number>(key, label, sourceUrl, {
        status: "not_found",
        rawValue: trimmed,
      });
    }
    return createEmptyField<number>(key, label, sourceUrl, {
      value: n,
      rawValue: trimmed,
      confidence: "medium",
      status: "found",
    });
  }

  return names.map((rawName, index) => {
    const name = normalizePlanName(rawName);
    const priceRaw = priceValues?.[index] ?? "";
    const parsed = parsePriceCell(priceRaw, plan.priceRule, months);
    const diskRaw = cellAt(disk, index);
    const storage = normalize.storage(diskRaw);
    const initialRaw = cellAt(initial, index);
    let initialFee: number | null =
      plan.defaultInitialFee !== undefined ? plan.defaultInitialFee : null;
    if (initialRaw) {
      if (/無料|無し|なし|0円/.test(initialRaw)) initialFee = 0;
      else initialFee = normalize.yen(initialRaw);
    }

    const billing =
      plan.billingPeriodLabel ??
      (periodKey ? normalize.billingPeriod(periodKey) : null) ??
      plan.periodHints[0] ??
      "36ヶ月";

    const storageTypeRaw = cellAt(storageTypeRow, index);
    let storageType: string | null = null;
    if (/NVMe/i.test(storageTypeRaw) || /NVMe/i.test(diskRaw)) storageType = "NVMe";
    else if (/SSD/i.test(storageTypeRaw) || /SSD/i.test(diskRaw)) storageType = "SSD";
    else if (/HDD/i.test(storageTypeRaw) || /HDD/i.test(diskRaw)) storageType = "HDD";

    return {
      name: createEmptyField<string>("name", "プラン名", sourceUrl, {
        value: name,
        rawValue: rawName,
        confidence: "high",
        status: "found",
      }),
      slugHint: slugifyJaPlanName(name),
      // Plan-specific URL is rarely in matrix cells; keep slot for future extractors.
      officialUrl: createEmptyField<string>("officialUrl", "プランURL", sourceUrl, {
        status: "not_found",
      }),
      regularMonthlyPrice: createEmptyField<number>(
        "regularMonthlyPrice",
        "通常月額",
        sourceUrl,
        parsed.regular != null
          ? {
              value: parsed.regular,
              rawValue: parsed.raw,
              sourceText: priceLabel
                ? `${priceLabel}: ${parsed.raw}`
                : parsed.raw,
              confidence: parsed.inferred ? "medium" : "high",
              status: "found",
              warning: parsed.warning ?? null,
              inferred: parsed.inferred ?? false,
            }
          : { status: "not_found", rawValue: priceRaw },
      ),
      campaignMonthlyPrice: createEmptyField<number>(
        "campaignMonthlyPrice",
        "キャンペーン月額",
        sourceUrl,
        plan.campaignAmbiguous
          ? {
              value: parsed.campaign,
              rawValue: parsed.raw,
              confidence: "medium",
              status: "ambiguous",
              warning:
                "キャンペーン価格の自動反映は行いません。管理画面で確認してください。",
            }
          : parsed.campaign != null
            ? {
                value: parsed.campaign,
                rawValue: parsed.raw,
                confidence: "medium",
                status: "found",
                warning: parsed.warning ?? null,
              }
            : { status: "not_found" },
      ),
      effectiveMonthlyPrice: createEmptyField<number>(
        "effectiveMonthlyPrice",
        "実質月額",
        sourceUrl,
        plan.effectiveAmbiguous !== false
          ? {
              value: parsed.effective ?? parsed.campaign ?? parsed.regular,
              rawValue: parsed.raw,
              confidence: "medium",
              status: "ambiguous",
              warning:
                "実質月額候補です。自動反映しません。",
              inferred: true,
            }
          : parsed.effective != null
            ? {
                value: parsed.effective,
                rawValue: parsed.raw,
                status: "found",
                confidence: "medium",
              }
            : { status: "not_found" },
      ),
      initialFee: createEmptyField<number>("initialFee", "初期費用", sourceUrl, {
        ...(initialFee != null
          ? {
              value: initialFee,
              rawValue: initialRaw || String(initialFee),
              confidence: "high" as const,
              status: "found" as const,
            }
          : { status: "not_found" as const }),
      }),
      billingPeriod: createEmptyField<string>(
        "billingPeriod",
        "契約期間",
        sourceUrl,
        {
          value: billing,
          rawValue: periodKey ?? billing,
          confidence: "medium",
          status: "found",
          warning: "代表契約期間として取得しています。",
          inferred: true,
        },
      ),
      minContractPeriod: stringField(
        "minContractPeriod",
        "最低契約期間",
        cellAt(minContractRow, index),
      ),
      freeTrialDays: countField("freeTrialDays", "無料お試し期間", cellAt(trialRow, index)),
      storageValue: createEmptyField<number>("storageValue", "容量", sourceUrl, {
        ...(storage.value != null
          ? {
              value: storage.value,
              rawValue: diskRaw,
              confidence: "high" as const,
              status: "found" as const,
            }
          : {
              status: "not_found" as const,
              rawValue: diskRaw,
              warning: /無制限/.test(diskRaw)
                ? "公式表記が無制限のため数値化していません。"
                : null,
            }),
      }),
      storageUnit: createEmptyField<string>(
        "storageUnit",
        "容量単位",
        sourceUrl,
        storage.unit
          ? {
              value: storage.unit,
              rawValue: diskRaw,
              confidence: "high",
              status: "found",
            }
          : { status: "not_found", rawValue: diskRaw },
      ),
      storageType: storageType
        ? createEmptyField<string>("storageType", "ストレージ種類", sourceUrl, {
            value: storageType,
            rawValue: storageTypeRaw || diskRaw,
            confidence: "medium",
            status: "found",
            inferred: true,
          })
        : createEmptyField<string>("storageType", "ストレージ種類", sourceUrl, {
            status: "not_found",
            rawValue: storageTypeRaw,
          }),
      cpu: stringField("cpu", "CPU", cellAt(cpuRow, index)),
      memory: stringField("memory", "メモリ", cellAt(memoryRow, index)),
      transferAmount: stringField(
        "transferAmount",
        "転送量",
        cellAt(transferRow, index),
      ),
      databaseCount: stringField(
        "databaseCount",
        "データベース数",
        cellAt(dbRow, index),
      ),
      multiDomainCount: stringField(
        "multiDomainCount",
        "マルチドメイン数",
        cellAt(multiDomainRow, index),
      ),
      freeDomainCount: stringField(
        "freeDomainCount",
        "無料ドメイン数",
        cellAt(freeDomainRow, index),
      ),
    };
  });
}

export function buildPlansFromCards(
  cardsData: ExtractedCards,
  plan: PlanFieldConfig,
  sourceUrl: string,
): ScrapedPlan[] {
  const cards = plan.planWhitelist?.length
    ? cardsData.cards.filter((c) => plan.planWhitelist!.includes(c.name))
    : cardsData.cards;

  return cards.map((card) => {
    const parsed = parsePriceCell(
      card.monthlyRaw || card.bodyText,
      plan.priceRule,
    );
    const storage = normalize.storage(card.storageRaw || card.bodyText);
    const initialFee = card.initialRaw
      ? /無料/.test(card.initialRaw)
        ? 0
        : normalize.yen(card.initialRaw)
      : (plan.defaultInitialFee ?? null);

    return {
      name: createEmptyField<string>("name", "プラン名", sourceUrl, {
        value: card.name,
        rawValue: card.name,
        confidence: "high",
        status: "found",
      }),
      slugHint: slugifyJaPlanName(card.name),
      regularMonthlyPrice: createEmptyField<number>(
        "regularMonthlyPrice",
        "通常月額",
        sourceUrl,
        parsed.regular != null
          ? {
              value: parsed.regular,
              rawValue: card.monthlyRaw ?? card.bodyText.slice(0, 120),
              confidence: "high",
              status: "found",
              warning: parsed.warning ?? null,
            }
          : { status: "not_found" },
      ),
      campaignMonthlyPrice: createEmptyField<number>(
        "campaignMonthlyPrice",
        "キャンペーン月額",
        sourceUrl,
        {
          status: "not_found",
          warning: "カード表示からキャンペーン月額を分離できませんでした。",
        },
      ),
      effectiveMonthlyPrice: createEmptyField<number>(
        "effectiveMonthlyPrice",
        "実質月額",
        sourceUrl,
        {
          value: parsed.regular,
          status: "ambiguous",
          confidence: "medium",
          inferred: true,
          warning: "表示月額を実質候補として保持しています。",
        },
      ),
      initialFee: createEmptyField<number>("initialFee", "初期費用", sourceUrl, {
        ...(initialFee != null
          ? {
              value: initialFee,
              rawValue: card.initialRaw ?? String(initialFee),
              confidence: "high" as const,
              status: "found" as const,
            }
          : { status: "not_found" as const }),
      }),
      billingPeriod: createEmptyField<string>(
        "billingPeriod",
        "契約期間",
        sourceUrl,
        {
          value: plan.billingPeriodLabel ?? plan.periodHints[0] ?? "36ヶ月",
          confidence: "medium",
          status: "found",
          inferred: true,
        },
      ),
      storageValue: createEmptyField<number>("storageValue", "容量", sourceUrl, {
        ...(storage.value != null
          ? {
              value: storage.value,
              rawValue: card.storageRaw ?? null,
              confidence: "high" as const,
              status: "found" as const,
            }
          : { status: "not_found" as const }),
      }),
      storageUnit: createEmptyField<string>(
        "storageUnit",
        "容量単位",
        sourceUrl,
        storage.unit
          ? {
              value: storage.unit,
              confidence: "high",
              status: "found",
            }
          : { status: "not_found" },
      ),
    };
  });
}

function aggregateBool(
  values: string[],
  mode: "all" | "some" | "first" = "some",
): boolean | null {
  const marks = values.map(markFromCellText);
  if (mode === "first") return marks[0] ?? null;
  if (mode === "all") {
    if (marks.every((m) => m === true)) return true;
    if (marks.every((m) => m === false)) return false;
    return null;
  }
  if (marks.some((m) => m === true)) return true;
  if (marks.every((m) => m === false)) return false;
  return null;
}

export function buildComparisonsFromMatrix(
  matrix: ExtractedMatrix,
  mappings: ComparisonMapping[],
  sourceUrl: string,
): ScrapedComparisonValue[] {
  return mappings.map((mapping) => {
    const row = findRow(matrix.rows, mapping.rowIncludes);
    let value: string | number | boolean | null = null;
    let status: "found" | "not_found" = "not_found";
    let raw: string | null = row?.label ?? null;

    if (mapping.valueType === "boolean") {
      if (row) {
        value = aggregateBool(row.values, mapping.aggregate ?? "some");
        status = value != null ? "found" : "not_found";
        raw = row.values.join(" / ");
      } else if (mapping.pageTextFallback?.test(matrix.pageText)) {
        const match = matrix.pageText.match(mapping.pageTextFallback);
        const idx = match?.index ?? 0;
        const win = matrix.pageText.slice(
          Math.max(0, idx - 60),
          Math.min(matrix.pageText.length, idx + 80),
        );
        // 否定表現がある場合は false、曖昧なら not_found（勝手に true にしない）
        if (
          /受け付けていません|受付していません|受け付けません|対応していません|ありません|ございません|非対応/.test(
            win,
          )
        ) {
          value = false;
          status = "found";
          raw = win.replace(/\s+/g, " ").trim().slice(0, 120);
        } else if (
          /なし|無し|不可/.test(win) &&
          !/あり|対応|○/.test(win)
        ) {
          value = false;
          status = "found";
          raw = win.replace(/\s+/g, " ").trim().slice(0, 120);
        } else {
          value = true;
          status = "found";
          raw = mapping.pageTextFallback.source;
        }
      }
    } else if (mapping.valueType === "number") {
      const text = row?.values.join(" ") ?? matrix.pageText;
      if (mapping.parse === "days") {
        const m = text.match(/(\d+)\s*日/);
        if (m) {
          value = Number(m[1]);
          status = "found";
          raw = m[0];
        }
      } else {
        const n = normalize.yen(text);
        if (n != null) {
          value = n;
          status = "found";
        }
      }
    } else {
      if (mapping.parse === "storage-media") {
        const fromRow = row
          ? `${row.label} ${row.values.join(" ")}`
          : "";
        const hint =
          normalize.storage(fromRow || matrix.pageText).mediaHint ??
          (mapping.pageTextFallback?.test(matrix.pageText) ? "SSD" : null);
        value = hint;
        status = hint ? "found" : "not_found";
        raw = fromRow || null;
      } else if (row) {
        value = row.values[0] ?? null;
        status = value ? "found" : "not_found";
        raw = row.values.join(" / ");
      } else if (mapping.pageTextFallback?.test(matrix.pageText)) {
        value = mapping.pageTextFallback.source;
        status = "found";
      }
    }

    return {
      ...createEmptyField(mapping.fieldSlug, mapping.label, sourceUrl, {
        value,
        rawValue: raw,
        confidence: status === "found" ? (mapping.inferred ? "medium" : "high") : "low",
        status,
        warning: mapping.warning ?? null,
        inferred: mapping.inferred ?? false,
      }),
      fieldSlug: mapping.fieldSlug,
    };
  });
}

export function buildFromPageData(
  definition: ScraperDefinition,
  pageData: Record<string, unknown>,
): {
  plans: ScrapedPlan[];
  comparisonValues: ScrapedComparisonValue[];
  sourceUrls: string[];
} {
  const sourceUrls = Object.values(pageData)
    .map((v) =>
      v && typeof v === "object" && "sourceUrl" in v
        ? String((v as { sourceUrl: string }).sourceUrl)
        : null,
    )
    .filter((u): u is string => Boolean(u));

  const cardsEntry = Object.values(pageData).find(isCards);
  if (cardsEntry && cardsEntry.cards.length > 0) {
    const matrix = mergeMatrices(pageData);
    const plans = buildPlansFromCards(
      cardsEntry,
      definition.plan,
      cardsEntry.sourceUrl,
    );
    const comparisonValues = matrix
      ? buildComparisonsFromMatrix(
          matrix,
          definition.comparisons,
          matrix.sourceUrl,
        )
      : buildComparisonsFromMatrix(
          {
            planNames: [],
            rows: {},
            periodRows: {},
            pageText: cardsEntry.pageText,
            sourceUrl: cardsEntry.sourceUrl,
          },
          definition.comparisons,
          cardsEntry.sourceUrl,
        );
    return { plans, comparisonValues, sourceUrls };
  }

  const matrix = mergeMatrices(pageData);
  if (!matrix) {
    throw new Error("抽出データから料金マトリクスを構築できませんでした。");
  }
  const plans = buildPlansFromMatrix(
    matrix,
    definition.plan,
    matrix.sourceUrl,
  );
  const comparisonValues = buildComparisonsFromMatrix(
    matrix,
    definition.comparisons,
    matrix.sourceUrl,
  );
  return { plans, comparisonValues, sourceUrls };
}

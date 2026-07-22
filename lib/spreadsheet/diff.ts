import {
  COMPARISON_ITEM_FIELD_MAP,
  COMPARISON_ITEM_FIELDS,
  PLAN_FIELD_MAP,
  PLAN_FIELDS,
  SERVICE_FIELD_MAP,
  SERVICE_FIELDS,
  SHEET_NAMES,
  type SheetFieldDef,
} from "@/lib/spreadsheet/fields";
import {
  formatCellDisplay,
  parseCell,
  valuesEqual,
  type CellValue,
} from "@/lib/spreadsheet/cells";
import type { ExportBundle, SheetRow } from "@/lib/spreadsheet/load";

export type DiffChangeType = "added" | "changed" | "unchanged" | "error";

export type SpreadsheetDiffItem = {
  id: string;
  sheetName: "services" | "plans" | "comparison_items";
  tableName:
    | "services"
    | "service_plans"
    | "comparison_fields"
    | "affiliate_links"
    | "comparison_values";
  recordId: string;
  recordSlug: string;
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  planName: string;
  fieldName: string;
  fieldLabel: string;
  oldValue: CellValue;
  newValue: CellValue;
  changeType: DiffChangeType;
  errorMessage?: string;
  warning?: string;
  selectable: boolean;
  rowNumber: number;
};

export type ImportErrorRow = {
  sheetName: string;
  rowNumber: number;
  recordId: string;
  errorCode: string;
  message: string;
  rawData?: Record<string, string>;
};

export type DiffBuildResult = {
  diffs: SpreadsheetDiffItem[];
  errors: ImportErrorRow[];
  warnings: string[];
  summary: {
    okRows: number;
    changed: number;
    added: number;
    unchanged: number;
    error: number;
    warning: number;
  };
};

function fieldMapFor(
  sheet: SpreadsheetDiffItem["sheetName"],
): Record<string, SheetFieldDef> {
  if (sheet === "services") return SERVICE_FIELD_MAP;
  if (sheet === "plans") return PLAN_FIELD_MAP;
  return COMPARISON_ITEM_FIELD_MAP;
}

function fieldsFor(sheet: SpreadsheetDiffItem["sheetName"]): SheetFieldDef[] {
  if (sheet === "services") return SERVICE_FIELDS;
  if (sheet === "plans") return PLAN_FIELDS;
  return COMPARISON_ITEM_FIELDS;
}

function resolveTable(
  sheet: SpreadsheetDiffItem["sheetName"],
  field: SheetFieldDef,
): SpreadsheetDiffItem["tableName"] {
  if (field.target.table === "services") return "services";
  if (field.target.table === "service_plans") return "service_plans";
  if (field.target.table === "comparison_fields") return "comparison_fields";
  if (field.target.table === "comparison_values") return "comparison_values";
  if (sheet === "plans") return "service_plans";
  if (sheet === "comparison_items") return "comparison_fields";
  return "services";
}

function checkMissingHeaders(
  sheetName: string,
  expected: string[],
  actual: string[],
  warnings: string[],
) {
  const set = new Set(actual);
  const missing = expected.filter((h) => !set.has(h));
  if (missing.length) {
    warnings.push(
      `${sheetName}: 不足列があります（警告）: ${missing.join(", ")}`,
    );
  }
  const unexpected = actual.filter((h) => h && !expected.includes(h));
  if (unexpected.length) {
    warnings.push(
      `${sheetName}: 想定外の列を無視します: ${unexpected.slice(0, 8).join(", ")}${unexpected.length > 8 ? "…" : ""}`,
    );
  }
}

function diffSheetRows(params: {
  sheetName: SpreadsheetDiffItem["sheetName"];
  sheetRows: Record<string, string>[];
  dbById: Map<string, SheetRow>;
  idKey: string;
  slugKey?: string;
  getMeta: (dbRow: SheetRow | undefined, sheetRow: Record<string, string>) => {
    serviceId: string;
    serviceSlug: string;
    serviceName: string;
    planName: string;
    recordSlug: string;
  };
  validateRow?: (
    sheetRow: Record<string, string>,
    rowNumber: number,
  ) => ImportErrorRow | null;
}): { diffs: SpreadsheetDiffItem[]; errors: ImportErrorRow[]; okRows: number } {
  const { sheetName, sheetRows, dbById, idKey, getMeta, validateRow } = params;
  const diffs: SpreadsheetDiffItem[] = [];
  const errors: ImportErrorRow[] = [];
  const seenIds = new Set<string>();
  let okRows = 0;
  const fields = fieldsFor(sheetName);
  const fieldMap = fieldMapFor(sheetName);

  sheetRows.forEach((sheetRow, idx) => {
    const rowNumber = idx + 2;
    const rawId = (sheetRow[idKey] ?? "").trim();

    if (!rawId) {
      errors.push({
        sheetName,
        rowNumber,
        recordId: "",
        errorCode: "missing_id",
        message: `必須ID（${idKey}）がありません`,
        rawData: sheetRow,
      });
      diffs.push({
        id: `${sheetName}:row${rowNumber}:error`,
        sheetName,
        tableName: resolveTable(sheetName, fields[0]),
        recordId: "",
        recordSlug: "",
        serviceId: "",
        serviceSlug: "",
        serviceName: "",
        planName: "",
        fieldName: idKey,
        fieldLabel: idKey,
        oldValue: null,
        newValue: null,
        changeType: "error",
        errorMessage: `必須ID（${idKey}）がありません`,
        selectable: false,
        rowNumber,
      });
      return;
    }

    if (seenIds.has(rawId)) {
      errors.push({
        sheetName,
        rowNumber,
        recordId: rawId,
        errorCode: "duplicate_id",
        message: `${idKey} が重複しています`,
        rawData: sheetRow,
      });
      diffs.push({
        id: `${sheetName}:${rawId}:dup`,
        sheetName,
        tableName: resolveTable(sheetName, fields[0]),
        recordId: rawId,
        recordSlug: "",
        serviceId: "",
        serviceSlug: "",
        serviceName: "",
        planName: "",
        fieldName: idKey,
        fieldLabel: idKey,
        oldValue: null,
        newValue: null,
        changeType: "error",
        errorMessage: `${idKey} が重複しています`,
        selectable: false,
        rowNumber,
      });
      return;
    }
    seenIds.add(rawId);

    if (validateRow) {
      const verr = validateRow(sheetRow, rowNumber);
      if (verr) {
        errors.push(verr);
        diffs.push({
          id: `${sheetName}:${rawId}:validate`,
          sheetName,
          tableName: resolveTable(sheetName, fields[0]),
          recordId: rawId,
          recordSlug: "",
          serviceId: "",
          serviceSlug: "",
          serviceName: "",
          planName: "",
          fieldName: idKey,
          fieldLabel: idKey,
          oldValue: null,
          newValue: null,
          changeType: "error",
          errorMessage: verr.message,
          selectable: false,
          rowNumber,
        });
        return;
      }
    }

    const dbRow = dbById.get(rawId);
    const isNew = !dbRow;
    const meta = getMeta(dbRow, sheetRow);
    let rowHasError = false;
    let rowHasChange = false;

    for (const field of fields) {
      if (field.readonly || field.identity) {
        // Identity consistency checks
        if (field.key === "slug" && dbRow && sheetRow.slug) {
          const sheetSlug = sheetRow.slug.trim();
          const dbSlug = String(dbRow.slug ?? "");
          if (sheetSlug && dbSlug && sheetSlug !== dbSlug) {
            rowHasError = true;
            errors.push({
              sheetName,
              rowNumber,
              recordId: rawId,
              errorCode: "id_slug_mismatch",
              message: `service_id と slug が一致しません（DB: ${dbSlug} / シート: ${sheetSlug}）`,
              rawData: sheetRow,
            });
            diffs.push({
              id: `${sheetName}:${rawId}:slug`,
              sheetName,
              tableName: "services",
              recordId: rawId,
              recordSlug: meta.recordSlug,
              serviceId: meta.serviceId,
              serviceSlug: meta.serviceSlug,
              serviceName: meta.serviceName,
              planName: meta.planName,
              fieldName: "slug",
              fieldLabel: "slug",
              oldValue: dbSlug,
              newValue: sheetSlug,
              changeType: "error",
              errorMessage: "service_id と slug が一致しません",
              selectable: false,
              rowNumber,
            });
          }
        }
        continue;
      }

      const def = fieldMap[field.key];
      if (!def) continue;

      const parsed = parseCell(sheetRow[field.key], def.kind, {
        identity: def.identity,
      });

      if (!parsed.ok) {
        rowHasError = true;
        errors.push({
          sheetName,
          rowNumber,
          recordId: rawId,
          errorCode: "invalid_value",
          message: `${field.key}: ${parsed.error}`,
          rawData: sheetRow,
        });
        diffs.push({
          id: `${sheetName}:${rawId}:${field.key}`,
          sheetName,
          tableName: resolveTable(sheetName, def),
          recordId: rawId,
          recordSlug: meta.recordSlug,
          serviceId: meta.serviceId,
          serviceSlug: meta.serviceSlug,
          serviceName: meta.serviceName,
          planName: meta.planName,
          fieldName: field.key,
          fieldLabel: field.key,
          oldValue: dbRow?.[field.key] ?? null,
          newValue: sheetRow[field.key] ?? null,
          changeType: "error",
          errorMessage: parsed.error,
          selectable: false,
          rowNumber,
        });
        continue;
      }

      if (parsed.skip) continue;

      const oldValue = (dbRow?.[field.key] ?? null) as CellValue;
      const newValue = parsed.value;

      if (!isNew && valuesEqual(oldValue, newValue)) {
        continue;
      }

      rowHasChange = true;
      const changeType: DiffChangeType = isNew ? "added" : "changed";

      diffs.push({
        id: `${sheetName}:${rawId}:${field.key}`,
        sheetName,
        tableName: resolveTable(sheetName, def),
        recordId: rawId,
        recordSlug: meta.recordSlug,
        serviceId: meta.serviceId,
        serviceSlug: meta.serviceSlug,
        serviceName: meta.serviceName,
        planName: meta.planName,
        fieldName: field.key,
        fieldLabel: field.key,
        oldValue,
        newValue,
        changeType,
        // 初期実装: 既存レコード更新のみ反映可（新規行は候補表示のみ）
        selectable: !isNew,
        warning: isNew
          ? "新規追加候補です。初期実装では既存レコードの更新のみ反映できます。"
          : undefined,
        rowNumber,
      });
    }

    if (!rowHasError) okRows += 1;

    if (!rowHasChange && !rowHasError && !isNew) {
      diffs.push({
        id: `${sheetName}:${rawId}:__unchanged__`,
        sheetName,
        tableName: resolveTable(sheetName, fields[0]),
        recordId: rawId,
        recordSlug: meta.recordSlug,
        serviceId: meta.serviceId,
        serviceSlug: meta.serviceSlug,
        serviceName: meta.serviceName,
        planName: meta.planName,
        fieldName: "—",
        fieldLabel: "—",
        oldValue: null,
        newValue: null,
        changeType: "unchanged",
        selectable: false,
        rowNumber,
      });
    }

    // New record with only identity → still mark as added placeholder if no field diffs
    if (isNew && !rowHasChange && !rowHasError) {
      diffs.push({
        id: `${sheetName}:${rawId}:__added__`,
        sheetName,
        tableName: resolveTable(sheetName, fields[0]),
        recordId: rawId,
        recordSlug: meta.recordSlug,
        serviceId: meta.serviceId || rawId,
        serviceSlug: meta.serviceSlug,
        serviceName: meta.serviceName,
        planName: meta.planName,
        fieldName: idKey,
        fieldLabel: "新規行",
        oldValue: null,
        newValue: rawId,
        changeType: "added",
        warning:
          "新規追加候補です。初期実装では既存レコードの更新のみ反映できます。",
        selectable: false,
        rowNumber,
      });
    }
  });

  return { diffs, errors, okRows };
}

/**
 * Build diffs between DB export and imported multi-sheet data.
 * Empty cells = unchanged. __CLEAR__ = set null.
 * Deletions are never generated.
 */
export function buildMultiSheetDiffs(params: {
  db: ExportBundle;
  services: { headers: string[]; rows: Record<string, string>[] };
  plans: { headers: string[]; rows: Record<string, string>[] };
  comparisonItems: { headers: string[]; rows: Record<string, string>[] };
}): DiffBuildResult {
  const warnings: string[] = [];
  checkMissingHeaders(
    SHEET_NAMES.services,
    params.db.serviceHeaders,
    params.services.headers,
    warnings,
  );
  checkMissingHeaders(
    SHEET_NAMES.plans,
    params.db.planHeaders,
    params.plans.headers,
    warnings,
  );
  checkMissingHeaders(
    SHEET_NAMES.comparisonItems,
    params.db.comparisonItemHeaders,
    params.comparisonItems.headers,
    warnings,
  );

  const serviceDb = new Map(
    params.db.serviceRows
      .filter((r) => r.service_id)
      .map((r) => [String(r.service_id), r]),
  );
  const planDb = new Map(
    params.db.planRows
      .filter((r) => r.plan_id)
      .map((r) => [String(r.plan_id), r]),
  );
  const cmpDb = new Map(
    params.db.comparisonItemRows
      .filter((r) => r.comparison_item_id)
      .map((r) => [String(r.comparison_item_id), r]),
  );

  const knownServiceIds = new Set(serviceDb.keys());
  const knownSlugs = new Map(
    params.db.serviceRows.map((r) => [String(r.slug), String(r.service_id)]),
  );

  const serviceResult = diffSheetRows({
    sheetName: "services",
    sheetRows: params.services.rows,
    dbById: serviceDb,
    idKey: "service_id",
    slugKey: "slug",
    getMeta: (dbRow, sheetRow) => ({
      serviceId: String(dbRow?.service_id ?? sheetRow.service_id ?? ""),
      serviceSlug: String(dbRow?.slug ?? sheetRow.slug ?? ""),
      serviceName: String(
        dbRow?.["サービス名"] ?? sheetRow["サービス名"] ?? "",
      ),
      planName: "",
      recordSlug: String(dbRow?.slug ?? sheetRow.slug ?? ""),
    }),
  });

  const planResult = diffSheetRows({
    sheetName: "plans",
    sheetRows: params.plans.rows,
    dbById: planDb,
    idKey: "plan_id",
    getMeta: (dbRow, sheetRow) => ({
      serviceId: String(dbRow?.service_id ?? sheetRow.service_id ?? ""),
      serviceSlug: String(dbRow?.service_slug ?? sheetRow.service_slug ?? ""),
      serviceName: String(
        dbRow?.["サービス名"] ?? sheetRow["サービス名"] ?? "",
      ),
      planName: String(dbRow?.["プラン名"] ?? sheetRow["プラン名"] ?? ""),
      recordSlug: String(dbRow?.service_slug ?? sheetRow.service_slug ?? ""),
    }),
    validateRow: (sheetRow, rowNumber) => {
      const sid = (sheetRow.service_id ?? "").trim();
      const planId = (sheetRow.plan_id ?? "").trim();
      if (sid && !knownServiceIds.has(sid)) {
        // allow if slug maps
        const slug = (sheetRow.service_slug ?? "").trim();
        if (!slug || !knownSlugs.has(slug)) {
          return {
            sheetName: "plans",
            rowNumber,
            recordId: planId,
            errorCode: "orphan_plan",
            message: "存在しないサービスにプランが紐づいています",
            rawData: sheetRow,
          };
        }
      }
      const dbPlan = planDb.get(planId);
      if (dbPlan && sid && String(dbPlan.service_id) !== sid) {
        return {
          sheetName: "plans",
          rowNumber,
          recordId: planId,
          errorCode: "plan_service_mismatch",
          message: "plan_id と service_id の関係が正しくありません",
          rawData: sheetRow,
        };
      }
      return null;
    },
  });

  // comparison item key uniqueness
  const seenKeys = new Set<string>();
  const cmpRowsValidated = params.comparisonItems.rows;
  const cmpExtraErrors: ImportErrorRow[] = [];
  cmpRowsValidated.forEach((row, idx) => {
    const key = (row["項目キー"] ?? "").trim();
    if (!key) return;
    if (seenKeys.has(key)) {
      cmpExtraErrors.push({
        sheetName: "comparison_items",
        rowNumber: idx + 2,
        recordId: (row.comparison_item_id ?? "").trim(),
        errorCode: "duplicate_key",
        message: `比較項目キーが重複しています: ${key}`,
        rawData: row,
      });
    }
    seenKeys.add(key);
  });

  const cmpResult = diffSheetRows({
    sheetName: "comparison_items",
    sheetRows: params.comparisonItems.rows,
    dbById: cmpDb,
    idKey: "comparison_item_id",
    getMeta: (dbRow, sheetRow) => ({
      serviceId: "",
      serviceSlug: "",
      serviceName: "",
      planName: "",
      recordSlug: String(dbRow?.["項目キー"] ?? sheetRow["項目キー"] ?? ""),
    }),
  });

  // Attach duplicate key errors
  for (const e of cmpExtraErrors) {
    cmpResult.errors.push(e);
    cmpResult.diffs.push({
      id: `comparison_items:${e.recordId}:dupkey`,
      sheetName: "comparison_items",
      tableName: "comparison_fields",
      recordId: e.recordId,
      recordSlug: "",
      serviceId: "",
      serviceSlug: "",
      serviceName: "",
      planName: "",
      fieldName: "項目キー",
      fieldLabel: "項目キー",
      oldValue: null,
      newValue: null,
      changeType: "error",
      errorMessage: e.message,
      selectable: false,
      rowNumber: e.rowNumber,
    });
  }

  const diffs = [
    ...serviceResult.diffs,
    ...planResult.diffs,
    ...cmpResult.diffs,
  ];
  const errors = [
    ...serviceResult.errors,
    ...planResult.errors,
    ...cmpResult.errors,
  ];

  const summary = {
    okRows:
      serviceResult.okRows + planResult.okRows + cmpResult.okRows,
    changed: diffs.filter((d) => d.changeType === "changed").length,
    added: diffs.filter((d) => d.changeType === "added").length,
    unchanged: diffs.filter((d) => d.changeType === "unchanged").length,
    error: diffs.filter((d) => d.changeType === "error").length,
    warning: warnings.length,
  };

  return { diffs, errors, warnings, summary };
}

export function summarizeDiffs(diffs: SpreadsheetDiffItem[]) {
  return {
    changed: diffs.filter((d) => d.changeType === "changed").length,
    added: diffs.filter((d) => d.changeType === "added").length,
    unchanged: diffs.filter((d) => d.changeType === "unchanged").length,
    error: diffs.filter((d) => d.changeType === "error").length,
    selectable: diffs.filter((d) => d.selectable).length,
  };
}

export function formatDiffValue(value: CellValue): string {
  return formatCellDisplay(value);
}

/** Legacy aliases used by older CSV path */
export type ConflictPolicy = "review" | "prefer_db" | "prefer_sheet";

export function buildSpreadsheetDiffs(): {
  diffs: SpreadsheetDiffItem[];
  errors: string[];
  matchedServiceIds: string[];
} {
  return { diffs: [], errors: ["flat Master import は非対応です"], matchedServiceIds: [] };
}

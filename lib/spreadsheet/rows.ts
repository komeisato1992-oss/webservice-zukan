/**
 * Legacy helpers kept for CSV/XLSX utilities and scrape lock mapping.
 */
import { CLEAR_SENTINEL, MASTER_HEADERS } from "@/lib/spreadsheet/fields";
import {
  serializeCell as serializeCellValue,
  type CellValue,
} from "@/lib/spreadsheet/cells";
import type { AffiliateLink, ServicePlan } from "@/lib/types/database";

export type SpreadsheetCellValue = CellValue;
export type SpreadsheetRow = Record<string, SpreadsheetCellValue>;

export function serializeCell(value: SpreadsheetCellValue): string {
  return serializeCellValue(value);
}

export function primaryAffiliate(
  links: AffiliateLink[] | undefined,
): AffiliateLink | null {
  if (!links?.length) return null;
  return (
    links.find((l) => l.is_primary && l.is_active) ??
    links.find((l) => l.is_primary) ??
    links.find((l) => l.is_active) ??
    links[0] ??
    null
  );
}

export function pickRepresentativePlan(plans: ServicePlan[]): ServicePlan | null {
  if (!plans.length) return null;
  return (
    plans.find((p) => p.is_default_comparison_plan) ??
    plans.find((p) => p.is_recommended) ??
    plans.find((p) => p.is_published) ??
    plans[0] ??
    null
  );
}

export function emptyTemplateRow(): SpreadsheetRow {
  const row: SpreadsheetRow = {};
  for (const h of MASTER_HEADERS) row[h] = null;
  return row;
}

export function parseCellRaw(raw: string): SpreadsheetCellValue {
  if (raw === CLEAR_SENTINEL) return null;
  return raw;
}

export function coerceIncomingValue(
  raw: string,
): SpreadsheetCellValue {
  return parseCellRaw(raw);
}

export function valuesEqual(a: SpreadsheetCellValue, b: SpreadsheetCellValue) {
  return String(a ?? "") === String(b ?? "");
}

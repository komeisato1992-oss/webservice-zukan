import { CLEAR_SENTINEL, type CellKind } from "@/lib/spreadsheet/fields";

export type CellValue = string | number | boolean | null;

export function serializeCell(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

export function isEmptyCell(raw: string | undefined | null): boolean {
  return raw == null || String(raw).trim() === "";
}

export function isClearSentinel(raw: string): boolean {
  return String(raw).trim() === CLEAR_SENTINEL;
}

export function parseBoolean(raw: string): boolean | null | "invalid" {
  const v = raw.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on", "公開", "はい", "○", "◯"].includes(v)) {
    return true;
  }
  if (["false", "0", "no", "n", "off", "非公開", "いいえ", "×", "✕"].includes(v)) {
    return false;
  }
  return "invalid";
}

export function parseNumber(raw: string): number | null | "invalid" {
  const t = raw.trim().replace(/,/g, "").replace(/円/g, "");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return "invalid";
  return n;
}

export function isValidHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Parse a sheet cell for a known field kind.
 * Empty → skip (undefined). __CLEAR__ → null. Invalid → error string.
 */
export function parseCell(
  raw: string | undefined,
  kind: CellKind,
  opts?: { allowClear?: boolean; identity?: boolean },
):
  | { ok: true; value: CellValue; skip: boolean; clear: boolean }
  | { ok: false; error: string } {
  const allowClear = opts?.allowClear !== false;
  const text = raw == null ? "" : String(raw);

  if (isEmptyCell(text)) {
    return { ok: true, value: null, skip: true, clear: false };
  }

  if (isClearSentinel(text)) {
    if (opts?.identity || !allowClear) {
      return { ok: false, error: "識別項目に __CLEAR__ は使用できません" };
    }
    return { ok: true, value: null, skip: false, clear: true };
  }

  const trimmed = text.trim();

  switch (kind) {
    case "boolean": {
      const b = parseBoolean(trimmed);
      if (b === "invalid") {
        return { ok: false, error: `真偽値が不正です: ${trimmed}` };
      }
      return { ok: true, value: b, skip: false, clear: false };
    }
    case "number": {
      const n = parseNumber(trimmed);
      if (n === "invalid") {
        return { ok: false, error: `数値が不正です: ${trimmed}` };
      }
      return { ok: true, value: n, skip: false, clear: false };
    }
    case "url": {
      if (!isValidHttpUrl(trimmed)) {
        return { ok: false, error: `URL形式が不正です: ${trimmed}` };
      }
      return { ok: true, value: trimmed, skip: false, clear: false };
    }
    case "readonly":
    case "identity":
    case "string":
    default:
      return { ok: true, value: trimmed, skip: false, clear: false };
  }
}

export function valuesEqual(a: CellValue, b: CellValue): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 1e-9;
  }
  if (typeof a === "boolean" && typeof b === "boolean") {
    return a === b;
  }
  return String(a) === String(b);
}

export function formatCellDisplay(value: CellValue): string {
  if (value === null || value === undefined) return "（空）";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

/** Prevent formula injection when writing sheets */
export function sanitizeSheetCell(value: string): string {
  if (/^[=+\-@]/.test(value)) return `'${value}`;
  return value;
}

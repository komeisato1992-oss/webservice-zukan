import { MASTER_HEADERS } from "@/lib/spreadsheet/fields";
import {
  serializeCell,
  type SpreadsheetCellValue,
  type SpreadsheetRow,
} from "@/lib/spreadsheet/rows";

/**
 * CSV injection guard: prefix dangerous formulas.
 * Preserve negative numbers (-123) — only escape when followed by non-digit patterns
 * that look like formulas (=, +, @, or - then letter/paren).
 */
export function sanitizeCsvCell(value: string): string {
  if (!value) return value;
  const first = value[0];
  if (first === "=" || first === "+" || first === "@") {
    return `'${value}`;
  }
  if (first === "-") {
    // Allow plain negative numbers: -1, -12.5
    if (/^-\d+(\.\d+)?$/.test(value.trim())) {
      return value;
    }
    return `'${value}`;
  }
  return value;
}

function escapeCsvField(raw: string): string {
  const safe = sanitizeCsvCell(raw);
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function rowsToCsv(
  rows: SpreadsheetRow[],
  headers: string[] = MASTER_HEADERS,
): string {
  const lines = [
    headers.map(escapeCsvField).join(","),
    ...rows.map((row) =>
      headers
        .map((h) => escapeCsvField(serializeCell(row[h] ?? null)))
        .join(","),
    ),
  ];
  // UTF-8 BOM for Excel
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function parseCsv(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  // Strip BOM
  const cleaned = text.replace(/^\uFEFF/, "");
  const records = parseCsvRecords(cleaned);
  if (records.length === 0) {
    return { headers: [], rows: [] };
  }
  const headers = records[0].map((h) => h.trim());
  const rows = records.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? "";
    });
    return obj;
  });
  return { headers, rows };
}

function parseCsvRecords(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\r") {
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function csvToBuffer(csv: string): Buffer {
  return Buffer.from(csv, "utf8");
}

export type { SpreadsheetCellValue };

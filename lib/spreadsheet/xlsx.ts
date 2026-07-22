import ExcelJS from "exceljs";
import { MASTER_HEADERS } from "@/lib/spreadsheet/fields";
import { serializeCell, type SpreadsheetRow } from "@/lib/spreadsheet/rows";
import { sanitizeCsvCell } from "@/lib/spreadsheet/csv";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

export function getMaxUploadBytes() {
  return MAX_UPLOAD_BYTES;
}

export async function rowsToXlsxBuffer(
  rows: SpreadsheetRow[],
  headers: string[] = MASTER_HEADERS,
  sheetName = "Master",
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "webservice-zukan";
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName);

  ws.addRow(headers);
  for (const row of rows) {
    ws.addRow(
      headers.map((h) => {
        const raw = serializeCell(row[h] ?? null);
        return sanitizeCsvCell(raw);
      }),
    );
  }

  // Header styling + freeze
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.commit();
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };

  // Reasonable column widths
  headers.forEach((h, i) => {
    const col = ws.getColumn(i + 1);
    col.width = Math.min(Math.max(h.length + 2, 12), 40);
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function parseXlsxBuffer(
  buffer: Buffer,
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error(
      `ファイルサイズが上限（${MAX_UPLOAD_BYTES / 1024 / 1024}MB）を超えています。`,
    );
  }

  const wb = new ExcelJS.Workbook();
  // exceljs accepts Node Buffer
  await wb.xlsx.load(buffer as never);
  const ws =
    wb.getWorksheet("Master") ??
    wb.worksheets[0];

  if (!ws) {
    return { headers: [], rows: [] };
  }

  const matrix: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      while (cells.length < colNumber - 1) cells.push("");
      const v = cell.value;
      if (v == null) {
        cells.push("");
      } else if (typeof v === "object" && "text" in v) {
        cells.push(String((v as { text: string }).text ?? ""));
      } else if (typeof v === "object" && "result" in v) {
        cells.push(String((v as { result: unknown }).result ?? ""));
      } else {
        cells.push(String(v));
      }
    });
    matrix.push(cells);
  });

  if (matrix.length === 0) return { headers: [], rows: [] };

  const headers = matrix[0].map((h) => h.trim());
  const rows = matrix.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? "";
    });
    return obj;
  });

  return { headers, rows };
}

export function assertAllowedUpload(
  filename: string,
  size: number,
  kind: "csv" | "xlsx",
) {
  if (size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `ファイルサイズが上限（${MAX_UPLOAD_BYTES / 1024 / 1024}MB）を超えています。`,
    );
  }
  const lower = filename.toLowerCase();
  if (kind === "csv" && !lower.endsWith(".csv")) {
    throw new Error("CSVファイル（.csv）を指定してください。");
  }
  if (kind === "xlsx" && !lower.endsWith(".xlsx")) {
    throw new Error("XLSXファイル（.xlsx）を指定してください。");
  }
}

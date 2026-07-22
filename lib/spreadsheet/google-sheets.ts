import { google } from "googleapis";
import { getGoogleSheetsEnv } from "@/lib/spreadsheet/google-env";
import { SHEET_NAMES } from "@/lib/spreadsheet/fields";
import {
  sanitizeSheetCell,
  serializeCell,
  type CellValue,
} from "@/lib/spreadsheet/cells";
import type { ExportBundle } from "@/lib/spreadsheet/load";

export type SheetsConnectionTestResult = {
  ok: boolean;
  steps: {
    auth: "ok" | "fail";
    spreadsheet: "ok" | "fail" | "skip";
    read: "ok" | "fail" | "skip";
    write: "ok" | "fail" | "skip";
  };
  errorCode?:
    | "auth"
    | "share"
    | "sheet_id"
    | "api_disabled"
    | "unknown";
  message: string;
  spreadsheetTitle?: string;
  sheetUrl?: string;
};

function classifyGoogleError(err: unknown): {
  code: SheetsConnectionTestResult["errorCode"];
  message: string;
} {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes("invalid_grant") ||
    lower.includes("invalid jwt") ||
    lower.includes("deactivated") ||
    lower.includes("private key")
  ) {
    return { code: "auth", message: "Google認証に失敗しました。サービスアカウントの鍵を確認してください。" };
  }
  if (
    lower.includes("not been used") ||
    lower.includes("disabled") ||
    lower.includes("access_not_configured")
  ) {
    return {
      code: "api_disabled",
      message: "Google Sheets API が有効化されていません。",
    };
  }
  if (
    lower.includes("the caller does not have permission") ||
    lower.includes("permission denied") ||
    lower.includes("forbidden")
  ) {
    return {
      code: "share",
      message:
        "スプレッドシートが共有されていません。サービスアカウントを編集者として共有してください。",
    };
  }
  if (
    lower.includes("requested entity was not found") ||
    lower.includes("not found")
  ) {
    return {
      code: "sheet_id",
      message: "スプレッドシートが見つかりません。IDを確認してください。",
    };
  }
  console.error("[google-sheets]", msg);
  return {
    code: "unknown",
    message: "Google Sheets API への接続に失敗しました。",
  };
}

export function getAuthClient() {
  const { email, privateKey } = getGoogleSheetsEnv();
  if (!email || !privateKey) {
    throw new Error("Google Sheets の環境変数が未設定です");
  }
  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export function getSheetsClient() {
  const auth = getAuthClient();
  return google.sheets({ version: "v4", auth });
}

export function spreadsheetUrl(sheetId: string) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
}

export async function getSpreadsheetMeta(): Promise<{
  title: string;
  sheetId: string;
  tabNames: string[];
}> {
  const { sheetId } = getGoogleSheetsEnv();
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  return {
    title: meta.data.properties?.title ?? "(無題)",
    sheetId,
    tabNames: (meta.data.sheets ?? [])
      .map((s) => s.properties?.title)
      .filter((t): t is string => Boolean(t)),
  };
}

export async function testSheetsConnection(): Promise<SheetsConnectionTestResult> {
  const { sheetId } = getGoogleSheetsEnv();
  const steps: SheetsConnectionTestResult["steps"] = {
    auth: "fail",
    spreadsheet: "skip",
    read: "skip",
    write: "skip",
  };

  try {
    const sheets = getSheetsClient();
    steps.auth = "ok";

    steps.spreadsheet = "fail";
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    steps.spreadsheet = "ok";
    const title = meta.data.properties?.title ?? undefined;

    steps.read = "fail";
    await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "A1",
    });
    steps.read = "ok";

    steps.write = "fail";
    // Probe write on a throwaway cell of first sheet
    const firstTitle =
      meta.data.sheets?.[0]?.properties?.title ?? SHEET_NAMES.syncInfo;
    const probeRange = `${escapeSheetName(firstTitle)}!ZZ1`;
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: probeRange,
    });
    const prev = existing.data.values?.[0]?.[0] ?? "";
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: probeRange,
      valueInputOption: "RAW",
      requestBody: { values: [["__connection_test__"]] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: probeRange,
      valueInputOption: "RAW",
      requestBody: { values: [[prev]] },
    });
    steps.write = "ok";

    return {
      ok: true,
      steps,
      message: "接続テスト成功",
      spreadsheetTitle: title,
      sheetUrl: spreadsheetUrl(sheetId),
    };
  } catch (err) {
    const classified = classifyGoogleError(err);
    return {
      ok: false,
      steps,
      errorCode: classified.code,
      message: classified.message,
      sheetUrl: sheetId ? spreadsheetUrl(sheetId) : undefined,
    };
  }
}

function escapeSheetName(name: string) {
  return `'${name.replace(/'/g, "''")}'`;
}

async function ensureSheet(
  sheets: ReturnType<typeof getSheetsClient>,
  spreadsheetId: string,
  title: string,
): Promise<number> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets?.find((s) => s.properties?.title === title);
  if (existing?.properties?.sheetId != null) {
    return existing.properties.sheetId;
  }
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }],
    },
  });
  const newId =
    res.data.replies?.[0]?.addSheet?.properties?.sheetId ?? undefined;
  if (newId == null) throw new Error(`シート「${title}」を作成できませんでした`);
  return newId;
}

function rowsToMatrix(
  headers: string[],
  rows: Record<string, CellValue>[],
): string[][] {
  return [
    headers,
    ...rows.map((row) =>
      headers.map((h) => sanitizeSheetCell(serializeCell(row[h] ?? null))),
    ),
  ];
}

async function writeSheetTab(params: {
  sheets: ReturnType<typeof getSheetsClient>;
  spreadsheetId: string;
  title: string;
  headers: string[];
  rows: Record<string, CellValue>[];
}) {
  const { sheets, spreadsheetId, title, headers, rows } = params;
  const sheetIdNum = await ensureSheet(sheets, spreadsheetId, title);
  const matrix = rowsToMatrix(headers, rows);
  const range = `${escapeSheetName(title)}`;

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${escapeSheetName(title)}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: matrix },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheetIdNum,
              gridProperties: { frozenRowCount: 1 },
            },
            fields: "gridProperties.frozenRowCount",
          },
        },
        {
          setBasicFilter: {
            filter: {
              range: {
                sheetId: sheetIdNum,
                startRowIndex: 0,
                endRowIndex: matrix.length,
                startColumnIndex: 0,
                endColumnIndex: headers.length,
              },
            },
          },
        },
      ],
    },
  });
}

export async function exportBundleToSheets(
  bundle: ExportBundle,
): Promise<{ sheetUrl: string; spreadsheetTitle: string }> {
  const { sheetId } = getGoogleSheetsEnv();
  const sheets = getSheetsClient();

  try {
    await writeSheetTab({
      sheets,
      spreadsheetId: sheetId,
      title: SHEET_NAMES.services,
      headers: bundle.serviceHeaders,
      rows: bundle.serviceRows,
    });
    await writeSheetTab({
      sheets,
      spreadsheetId: sheetId,
      title: SHEET_NAMES.plans,
      headers: bundle.planHeaders,
      rows: bundle.planRows,
    });
    await writeSheetTab({
      sheets,
      spreadsheetId: sheetId,
      title: SHEET_NAMES.campaigns,
      headers: bundle.campaignHeaders,
      rows: bundle.campaignRows,
    });
    await writeSheetTab({
      sheets,
      spreadsheetId: sheetId,
      title: SHEET_NAMES.comparisonFields,
      headers: bundle.comparisonItemHeaders,
      rows: bundle.comparisonItemRows,
    });
    await writeSheetTab({
      sheets,
      spreadsheetId: sheetId,
      title: SHEET_NAMES.comparisonLayout,
      headers: bundle.comparisonLayoutHeaders,
      rows: bundle.comparisonLayoutRows,
    });
    await writeSheetTab({
      sheets,
      spreadsheetId: sheetId,
      title: SHEET_NAMES.scrapingCandidates,
      headers: bundle.scrapingCandidateHeaders,
      rows: bundle.scrapingCandidateRows,
    });
    await writeSheetTab({
      sheets,
      spreadsheetId: sheetId,
      title: SHEET_NAMES.rankings,
      headers: bundle.rankingHeaders,
      rows: bundle.rankingRows,
    });
    await writeSheetTab({
      sheets,
      spreadsheetId: sheetId,
      title: SHEET_NAMES.syncInfo,
      headers: bundle.syncInfoHeaders,
      rows: bundle.syncInfoRows,
    });
  } catch (err) {
    const classified = classifyGoogleError(err);
    throw new Error(classified.message);
  }

  const meta = await getSpreadsheetMeta();
  return {
    sheetUrl: spreadsheetUrl(sheetId),
    spreadsheetTitle: meta.title,
  };
}

export type SheetRecords = {
  headers: string[];
  rows: Record<string, string>[];
  missing: boolean;
};

export async function readNamedSheet(
  title: string,
): Promise<SheetRecords> {
  const { sheetId } = getGoogleSheetsEnv();
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === title);
  if (!exists) {
    return { headers: [], rows: [], missing: true };
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: escapeSheetName(title),
  });
  const values = res.data.values ?? [];
  if (values.length === 0) return { headers: [], rows: [], missing: false };

  const headers = values[0].map((h) => String(h ?? "").trim());
  const rows = values.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (!h) return;
      obj[h] = cells[i] != null ? String(cells[i]) : "";
    });
    return obj;
  });
  return { headers, rows, missing: false };
}

export async function readAllSyncSheets(): Promise<{
  services: SheetRecords;
  plans: SheetRecords;
  comparisonItems: SheetRecords;
  rankings: SheetRecords;
  syncInfo: SheetRecords;
  spreadsheetTitle: string;
}> {
  try {
    const [services, plans, comparisonItems, rankings, syncInfo, meta] =
      await Promise.all([
        readNamedSheet(SHEET_NAMES.services),
        readNamedSheet(SHEET_NAMES.plans),
        readNamedSheet(SHEET_NAMES.comparisonItems),
        readNamedSheet(SHEET_NAMES.rankings),
        readNamedSheet(SHEET_NAMES.syncInfo),
        getSpreadsheetMeta(),
      ]);
    return {
      services,
      plans,
      comparisonItems,
      rankings,
      syncInfo,
      spreadsheetTitle: meta.title,
    };
  } catch (err) {
    const classified = classifyGoogleError(err);
    throw new Error(classified.message);
  }
}

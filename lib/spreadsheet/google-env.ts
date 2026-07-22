/**
 * Google Sheets credentials — server-side only.
 * Prefers spec env names; falls back to earlier names for compatibility.
 */
export function getGoogleSheetsEnv() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || "";

  let privateKey =
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() ||
    process.env.GOOGLE_PRIVATE_KEY?.trim() ||
    "";
  privateKey = privateKey.replace(/\\n/g, "\n");

  const sheetId =
    process.env.GOOGLE_SPREADSHEET_ID?.trim() ||
    process.env.GOOGLE_SHEET_ID?.trim() ||
    "";

  return { email, privateKey, sheetId };
}

export function hasGoogleSheetsEnv() {
  const { email, privateKey, sheetId } = getGoogleSheetsEnv();
  return Boolean(email && privateKey && sheetId);
}

export type SheetsConfigStatus = {
  configured: boolean;
  missing: string[];
  sheetId: string;
  email: string;
};

export function getSheetsConfigStatus(): SheetsConfigStatus {
  const { email, privateKey, sheetId } = getGoogleSheetsEnv();
  const missing: string[] = [];
  if (!email) missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  if (!privateKey) {
    missing.push(
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY（または GOOGLE_PRIVATE_KEY）",
    );
  }
  if (!sheetId) {
    missing.push("GOOGLE_SPREADSHEET_ID（または GOOGLE_SHEET_ID）");
  }
  return {
    configured: missing.length === 0,
    missing,
    sheetId,
    email,
  };
}

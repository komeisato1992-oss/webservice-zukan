import { SpreadsheetSyncPanel } from "@/components/admin/spreadsheet-sync-panel";
import { getSpreadsheetPageDataAction } from "@/lib/actions/spreadsheet";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminSpreadsheetPage() {
  const result = await getSpreadsheetPageDataAction();
  if (!result.ok || !result.data) {
    redirect("/admin/login");
  }

  return <SpreadsheetSyncPanel initial={result.data} />;
}

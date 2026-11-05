import type { GridApi } from "ag-grid-community";
import { csvFile, protectFormula } from "@/lib/export/csv-text";

// "dueline-paypal-2026-10.csv" for the grid of PayPal payments in October 2026.
export function gridCsvFileName(kind: "paypal" | "bank", month: string): string {
  return `dueline-${kind}-${month}.csv`;
}

// AG Grid writes the CSV from the columns as they are on screen, headers included; the totals row
// is left out. The file starts with a byte order mark, so a spreadsheet reads € and ₹, and a cell that starts like a
// formula is defused as in the server's CSV.
export function exportGridCsv<T>(api: GridApi<T>, fileName: string): void {
  const csv = api.getDataAsCsv({
    skipPinnedBottom: true,
    processCellCallback: ({ value }) => (typeof value === "string" ? protectFormula(value) : value),
  });
  if (csv === undefined) return;
  const url = URL.createObjectURL(new Blob([csvFile([csv])], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

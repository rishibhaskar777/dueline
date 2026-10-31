import { cell, csvFile, csvLine } from "@/lib/export/csv-text";
import { ESTIMATE_LABEL } from "@/lib/export/tax-notes";
import { fromMinorUnits } from "@/lib/money/decimal";

// The export-of-services columns of the offline tool's exp sheet.
const HEADER = [
  "Export Type",
  "Invoice Number",
  "Invoice date",
  "Invoice Value",
  "Port Code",
  "Shipping Bill Number",
  "Shipping Bill Date",
  "Rate",
  "Taxable Value",
  "Cess Amount",
];

const NOTE = `${ESTIMATE_LABEL} Rupee values use the ECB rate of the invoice date; the GST rule uses the RBI reference rate.`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface Gstr1Row {
  exportType: "WPAY" | "WOPAY";
  invoiceNumber: string;
  invoiceDate: string;
  valuePaise: number;
  rate: 0 | 18;
}

// The tool wants dd-mmm-yyyy, with English month names whatever the locale.
export function gstDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}-${MONTHS[Number(month) - 1]}-${year}`;
}

function rowOf(row: Gstr1Row): string {
  const value = fromMinorUnits(row.valuePaise);
  return csvLine([
    row.exportType,
    row.invoiceNumber,
    gstDate(row.invoiceDate),
    value,
    null,
    null,
    null,
    row.rate,
    value,
    null,
  ]);
}

export function toGstr1Csv(rows: Gstr1Row[]): string {
  return csvFile([csvLine(HEADER), ...rows.map(rowOf), "", cell(NOTE)]);
}

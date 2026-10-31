import { cell, csvFile, csvLine } from "@/lib/export/csv-text";
import { findPurposeCode } from "@/lib/export/purpose-codes";
import type { ExportRegister, ExportRegisterRow } from "@/types";

const HEADER = [
  "Invoice number",
  "Client",
  "Client country",
  "Paid on (IST)",
  "Currency",
  "Invoice amount",
  "PayPal fee",
  "Net received (foreign)",
  "Rupees received",
  "Rupee source",
  "Rate used",
  "Rate date",
  "Purpose code",
  "Purpose description",
  "SAC",
  "Under LUT",
  "PayPal transaction ID",
];

function rowOf(row: ExportRegisterRow): string {
  return csvLine([
    row.invoiceNumber,
    row.clientName,
    row.clientCountry,
    row.paidOn,
    row.foreign.currency,
    row.foreign.value,
    row.fee?.value ?? null,
    row.net?.value ?? null,
    row.inrReceived,
    row.inrSource === "paypal" ? "PayPal" : "Estimate",
    row.rateUsed,
    row.rateDate,
    row.purposeCode,
    row.purposeCode ? (findPurposeCode(row.purposeCode)?.label ?? null) : null,
    row.sac,
    row.underLut ? "Yes" : "No",
    row.transactionId,
  ]);
}

function outsideNote(numbers: string[]): string[] {
  if (numbers.length === 0) return [];
  const note = `Recorded outside PayPal (not on PayPal's FIRA): ${numbers.length}`;
  return ["", cell(note), cell(numbers.join(", "))];
}

// The freelancer's GSTIN goes in a comment line above the column headers, when the profile has one.
export function toCsv(register: ExportRegister, gstin: string | null = null): string {
  return csvFile([
    ...(gstin ? [cell(`# GSTIN: ${gstin}`)] : []),
    csvLine(HEADER),
    ...register.rows.map(rowOf),
    ...outsideNote(register.recordedOutsidePayPal),
  ]);
}

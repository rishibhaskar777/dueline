import { cell, csvFile, csvLine } from "@/lib/export/csv-text";
import { findPurposeCode } from "@/lib/export/purpose-codes";
import type { ExportOutsideRow, ExportRegister, ExportRegisterRow } from "@/types";

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
  "Proof",
];

type Cells = (string | number | null)[];

function leadingCells(row: ExportRegisterRow | ExportOutsideRow): Cells {
  return [
    row.invoiceNumber,
    row.clientName,
    row.clientCountry,
    row.paidOn,
    row.foreign.currency,
    row.foreign.value,
  ];
}

function rupeeCells(row: ExportRegisterRow | ExportOutsideRow): Cells {
  return [
    row.inrReceived,
    row.inrSource === "paypal" ? "PayPal" : "Estimate",
    row.rateUsed,
    row.rateDate,
    row.purposeCode,
    row.purposeCode ? (findPurposeCode(row.purposeCode)?.label ?? null) : null,
    row.sac,
    row.underLut ? "Yes" : "No",
  ];
}

function payPalLine(row: ExportRegisterRow): string {
  return csvLine([
    ...leadingCells(row),
    row.fee?.value ?? null,
    row.net?.value ?? null,
    ...rupeeCells(row),
    row.transactionId,
    "PayPal FIRA",
  ]);
}

function bankLine(row: ExportOutsideRow): string {
  const proof = row.bankReference
    ? `Bank FIRC/e-BRC ${row.bankReference}`
    : "Bank, reference missing";
  return csvLine([...leadingCells(row), null, null, ...rupeeCells(row), null, proof]);
}

// The freelancer's GSTIN goes in a comment line above the column headers, when the profile has one.
// PayPal payments and bank transfers share the table, told apart by the Proof column.
export function toCsv(register: ExportRegister, gstin: string | null = null): string {
  const lines = [
    ...register.rows.map((row) => ({ row, line: payPalLine(row) })),
    ...register.outsideRows.map((row) => ({ row, line: bankLine(row) })),
  ].sort(
    (a, b) =>
      a.row.paidOn.localeCompare(b.row.paidOn) ||
      a.row.invoiceNumber.localeCompare(b.row.invoiceNumber, "en", { numeric: true }),
  );
  return csvFile([
    ...(gstin ? [cell(`# GSTIN: ${gstin}`)] : []),
    csvLine(HEADER),
    ...lines.map(({ line }) => line),
  ]);
}

import { findPurposeCode } from "@/lib/export/purpose-codes";
import type { ExportRegister, ExportRegisterRow } from "@/types";

const BYTE_ORDER_MARK = "﻿";
const LINE_END = "\r\n";
// A spreadsheet runs a cell that starts with one of these as a formula.
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;

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
  "Under LUT",
  "PayPal transaction ID",
];

function cell(value: string | number | null): string {
  if (value === null) return "";
  const text = typeof value === "string" && FORMULA_START.test(value) ? `'${value}` : String(value);
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowOf(row: ExportRegisterRow): string[] {
  return [
    cell(row.invoiceNumber),
    cell(row.clientName),
    cell(row.clientCountry),
    cell(row.paidOn),
    cell(row.foreign.currency),
    cell(row.foreign.value),
    cell(row.fee?.value ?? null),
    cell(row.net?.value ?? null),
    cell(row.inrReceived),
    cell(row.inrSource === "paypal" ? "PayPal" : "Estimate"),
    cell(row.rateUsed),
    cell(row.rateDate),
    cell(row.purposeCode),
    cell(row.purposeCode ? (findPurposeCode(row.purposeCode)?.label ?? null) : null),
    cell(row.underLut ? "Yes" : "No"),
    cell(row.transactionId),
  ];
}

function outsideNote(numbers: string[]): string[] {
  if (numbers.length === 0) return [];
  const note = `Recorded outside PayPal (not on PayPal's FIRA): ${numbers.length}`;
  return ["", cell(note), cell(numbers.join(", "))];
}

export function toCsv(register: ExportRegister): string {
  const lines = [
    ...[HEADER.map(cell), ...register.rows.map(rowOf)].map((line) => line.join(",")),
    ...outsideNote(register.recordedOutsidePayPal),
  ];
  return BYTE_ORDER_MARK + lines.join(LINE_END) + LINE_END;
}

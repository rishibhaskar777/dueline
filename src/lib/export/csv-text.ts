const BYTE_ORDER_MARK = "﻿";
const LINE_END = "\r\n";
// A spreadsheet runs a cell that starts with one of these as a formula.
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;

export function cell(value: string | number | null): string {
  if (value === null) return "";
  const text = typeof value === "string" && FORMULA_START.test(value) ? `'${value}` : String(value);
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function csvLine(values: (string | number | null)[]): string {
  return values.map(cell).join(",");
}

// UTF-8 with a byte order mark, so a spreadsheet reads rupee signs and accents correctly.
export function csvFile(lines: string[]): string {
  return BYTE_ORDER_MARK + lines.join(LINE_END) + LINE_END;
}

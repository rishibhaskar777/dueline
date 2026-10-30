import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/export/csv";
import { exportRegister } from "@/mocks/fixtures";
import type { ExportRegister, ExportRegisterRow } from "@/types";

const [estimateRow, paypalRow] = exportRegister.rows;

function register(...rows: ExportRegisterRow[]): ExportRegister {
  return { ...exportRegister, rows };
}

function lines(csv: string): string[] {
  return csv.replace(/^﻿/, "").split("\r\n");
}

describe("toCsv", () => {
  it("starts with a byte order mark, then the header, and ends each line with CRLF", () => {
    const csv = toCsv(register(paypalRow));
    expect(csv.startsWith("﻿Invoice number,")).toBe(true);
    expect(lines(csv)[0]).toBe(
      "Invoice number,Client,Client country,Paid on (IST),Currency,Invoice amount,PayPal fee,Net received (foreign),Rupees received,Rupee source,Rate used,Rate date,Purpose code,Purpose description,Under LUT,PayPal transaction ID",
    );
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.replaceAll("\r\n", "")).not.toMatch(/[\r\n]/);
  });

  it("writes a row PayPal reported with its fee, net and transaction ID", () => {
    expect(lines(toCsv(register(paypalRow)))[1]).toBe(
      "INV-0042,Halden Coffee Co.,United States,2026-10-15,USD,450.00,20.10,429.90,35617,PayPal,,,P1099,Other services not included elsewhere,Yes,5GX12345AB6789012",
    );
  });

  it("writes an estimated row with the rate and its date, and leaves PayPal's cells empty", () => {
    expect(lines(toCsv(register(estimateRow)))[1]).toBe(
      "INV-0041,Halden Coffee Co.,United States,2026-10-07,USD,280.00,,,22824,Estimate,85.36,2026-10-07,P1099,Other services not included elsewhere,No,",
    );
  });

  it("quotes a client name with a comma and quotes", () => {
    const row = { ...paypalRow, clientName: 'Halden, "Coffee" Co.' };
    expect(lines(toCsv(register(row)))[1].split(",United States")[0]).toBe(
      'INV-0042,"Halden, ""Coffee"" Co."',
    );
  });

  it.each([
    ["=SUM(A1)", "'=SUM(A1)"],
    ["+1", "'+1"],
    ["-1", "'-1"],
    ["@cmd", "'@cmd"],
    ["\tx", "'\tx"],
    ["\rx", '"\'\rx"'],
    ['=HYPERLINK("http://example.com")', '"\'=HYPERLINK(""http://example.com"")"'],
  ])("prefixes the client name %j so a spreadsheet does not run it", (name, cell) => {
    const row = { ...paypalRow, invoiceNumber: "INV-1", clientName: name };
    expect(toCsv(register(row))).toContain(`INV-1,${cell},United States,`);
  });

  it("leaves a name with a dash or at sign inside it alone", () => {
    const row = { ...paypalRow, invoiceNumber: "INV-1", clientName: "Smith-Jones @ Acme" };
    expect(toCsv(register(row))).toContain("INV-1,Smith-Jones @ Acme,United States,");
  });

  it("leaves a missing purpose code and client country empty", () => {
    const row = { ...paypalRow, purposeCode: null, clientCountry: null, underLut: false };
    expect(lines(toCsv(register(row)))[1]).toBe(
      "INV-0042,Halden Coffee Co.,,2026-10-15,USD,450.00,20.10,429.90,35617,PayPal,,,,,No,5GX12345AB6789012",
    );
  });

  it("writes only the header for an empty month", () => {
    const csv = toCsv({
      month: "2026-09",
      rows: [],
      totalInr: 0,
      totalsByCurrency: [],
      paypalInr: 0,
      estimatedInr: 0,
      missingPurposeCodes: 0,
    });
    expect(lines(csv)).toHaveLength(2);
    expect(lines(csv)[1]).toBe("");
  });
});

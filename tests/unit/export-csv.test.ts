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
      "Invoice number,Client,Client country,Paid on (IST),Currency,Invoice amount,PayPal fee,Net received (foreign),Rupees received,Rupee source,Rate used,Rate date,Purpose code,Purpose description,SAC,Under LUT,PayPal transaction ID,Proof",
    );
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.replaceAll("\r\n", "")).not.toMatch(/[\r\n]/);
  });

  it("writes a row PayPal reported with its fee, net and transaction ID", () => {
    expect(lines(toCsv(register(paypalRow)))[1]).toBe(
      "INV-0042,Halden Coffee Co.,United States,2026-10-15,USD,450.00,20.10,429.90,35617,PayPal,,,P1099,Other services not included elsewhere,998391,Yes,5GX12345AB6789012,PayPal FIRA",
    );
  });

  it("writes an estimated row with the rate and its date, and leaves PayPal's cells empty", () => {
    expect(lines(toCsv(register(estimateRow)))[1]).toBe(
      "INV-0041,Halden Coffee Co.,United States,2026-10-07,USD,280.00,,,22824,Estimate,85.36,2026-10-07,P1099,Other services not included elsewhere,998391,No,,PayPal FIRA",
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
      "INV-0042,Halden Coffee Co.,,2026-10-15,USD,450.00,20.10,429.90,35617,PayPal,,,,,998391,No,5GX12345AB6789012,PayPal FIRA",
    );
  });

  it("writes only the header for an empty month", () => {
    const csv = toCsv({
      ...exportRegister,
      month: "2026-09",
      rows: [],
      outsideRows: [],
      totalInr: 0,
      totalsByCurrency: [],
      paypalInr: 0,
      estimatedInr: 0,
      missingPurposeCodes: 0,
    });
    expect(lines(csv)).toHaveLength(2);
    expect(lines(csv)[1]).toBe("");
  });

  describe("bank transfers", () => {
    const bankRow = {
      ...paypalRow,
      fee: undefined,
      net: undefined,
      transactionId: undefined,
      invoiceNumber: "INV-0007",
      paidOn: "2026-10-02",
      inrSource: "estimate" as const,
      rateUsed: null,
      rateDate: null,
      bankReference: "FIRC/2026/0042" as string | null,
    };
    const withBank = (...outsideRows: (typeof bankRow)[]): ExportRegister => ({
      ...register(paypalRow),
      outsideRows,
    });

    it("writes a bank transfer in the same table, with no PayPal fee or transaction, and its proof", () => {
      expect(lines(toCsv(withBank(bankRow)))[1]).toBe(
        "INV-0007,Halden Coffee Co.,United States,2026-10-02,USD,450.00,,,35617,Estimate,,,P1099,Other services not included elsewhere,998391,Yes,,Bank FIRC/e-BRC FIRC/2026/0042",
      );
    });

    it("says when the bank reference is missing", () => {
      const csv = toCsv(withBank({ ...bankRow, bankReference: null }));
      expect(lines(csv)[1]).toMatch(/,"Bank, reference missing"$/);
    });

    it("sorts both kinds of row by the day they were paid", () => {
      const csv = lines(toCsv(withBank(bankRow)));
      expect(csv[1].startsWith("INV-0007,")).toBe(true);
      expect(csv[2].startsWith("INV-0042,")).toBe(true);
    });

    it("keeps a spreadsheet from running a reference that starts like a formula", () => {
      const csv = toCsv(withBank({ ...bankRow, bankReference: "-1" }));
      expect(csv).toContain("Bank FIRC/e-BRC -1");
      expect(toCsv(withBank({ ...bankRow, clientName: "=1+1" }))).toContain(",'=1+1,");
    });
  });
});

describe("toCsv with a GSTIN", () => {
  it("puts the GSTIN in a comment line above the column headers", () => {
    const csv = lines(toCsv(register(paypalRow), "29ABCPS1234C1Z5"));
    expect(csv[0]).toBe("# GSTIN: 29ABCPS1234C1Z5");
    expect(csv[1].startsWith("Invoice number,")).toBe(true);
  });

  it("writes no comment line without a GSTIN", () => {
    expect(lines(toCsv(register(paypalRow), null))[0].startsWith("Invoice number,")).toBe(true);
  });

  it("leaves the SAC empty when the invoice has none", () => {
    const row = { ...paypalRow, sac: null };
    expect(lines(toCsv(register(row)))[1]).toContain("elsewhere,,Yes,");
  });
});

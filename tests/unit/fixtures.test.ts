import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isPurposeCode } from "@/lib/export/purpose-codes";
import {
  activity,
  exportRegister,
  extraction,
  haldenLabelsInvoice,
  invoices,
  payoutEstimate,
  settings,
  totals,
} from "@/mocks/fixtures";
import {
  createInvoiceRequestSchema,
  extractRequestSchema,
  invoiceDraftSchema,
  payoutEstimateRequestSchema,
  settingsSchema,
} from "@/types";

describe("fixtures", () => {
  it("accepts the sample chat as an extract request", () => {
    const chat = readFileSync("tests/fixtures/chats/halden-logos.txt", "utf8");
    expect(extractRequestSchema.safeParse({ chat }).success).toBe(true);
  });

  it("accepts the extracted draft as an invoice draft", () => {
    expect(invoiceDraftSchema.safeParse(extraction.draft).success).toBe(true);
  });

  it("accepts the extracted draft in a create-invoice request", () => {
    const body = { draft: extraction.draft, requestId: crypto.randomUUID() };
    expect(createInvoiceRequestSchema.safeParse(body).success).toBe(true);
  });

  it("accepts the payout estimate's gross amount and the default settings", () => {
    expect(payoutEstimateRequestSchema.safeParse({ amount: payoutEstimate.gross }).success).toBe(
      true,
    );
    expect(settingsSchema.safeParse(settings).success).toBe(true);
  });

  it("uses only listed purpose codes", () => {
    const codes = [
      ...invoices.map((invoice) => invoice.purposeCode),
      ...exportRegister.rows.map((row) => row.purposeCode),
      extraction.draft.purposeCode,
    ];
    for (const code of codes) {
      expect(code !== null && isPurposeCode(code)).toBe(true);
    }
  });

  it("has totals that agree with the invoices", () => {
    const unpaid = invoices.filter((invoice) => invoice.paidOn === null);
    const overdue = unpaid.filter((invoice) => invoice.dueState === "overdue");
    const sum = (list: typeof invoices) =>
      list.reduce((total, invoice) => total + (invoice.payoutInr ?? 0), 0);

    expect(totals.outstandingInr).toBe(sum(unpaid));
    expect(totals.overdueInr).toBe(sum(overdue));
    expect(totals.overdueCount).toBe(overdue.length);
    expect(totals.paidThisMonthInr).toBe(exportRegister.totalInr);
  });

  it("has an export register that matches the paid invoices", () => {
    const paid = invoices.filter((invoice) => invoice.paidOn?.startsWith("2026-10"));
    expect(exportRegister.rows.map((row) => row.invoiceId).sort()).toEqual(
      paid.map((invoice) => invoice.id).sort(),
    );
    expect(exportRegister.rows.reduce((total, row) => total + row.inrReceived, 0)).toBe(
      exportRegister.totalInr,
    );
    expect(exportRegister.rows[0].inrReceived).toBe(haldenLabelsInvoice.actualPayout?.netInr);
  });

  it("has activity events that point at known invoices", () => {
    const ids = new Set(invoices.map((invoice) => invoice.id));
    expect(activity.every((event) => ids.has(event.invoiceId))).toBe(true);
  });
});

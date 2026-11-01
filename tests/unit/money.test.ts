import { describe, expect, it } from "vitest";
import { fromMinorUnits, toMinorUnits } from "@/lib/money/decimal";
import { computeTotals } from "@/lib/money/totals";
import { invoices } from "@/mocks/fixtures";
import type { InvoiceSummary } from "@/types";

describe("decimal amounts", () => {
  it("converts to minor units without floating point", () => {
    expect(toMinorUnits("450.00")).toBe(45000);
    expect(toMinorUnits("0.30")).toBe(30);
    expect(toMinorUnits("19.9")).toBe(1990);
    expect(toMinorUnits("7")).toBe(700);
    expect(toMinorUnits("-20.10")).toBe(-2010);
  });

  it("converts back to a decimal string", () => {
    expect(fromMinorUnits(45000)).toBe("450.00");
    expect(fromMinorUnits(5)).toBe("0.05");
    expect(fromMinorUnits(-2010)).toBe("-20.10");
  });

  it("rejects text that is not an amount", () => {
    expect(() => toMinorUnits("12.345")).toThrow(RangeError);
    expect(() => toMinorUnits("abc")).toThrow(RangeError);
  });
});

function invoice(overrides: Partial<InvoiceSummary>): InvoiceSummary {
  return { ...invoices[0], actualPayout: null, ...overrides };
}

describe("computeTotals", () => {
  it("counts only invoices that have a rupee figure", () => {
    const totals = computeTotals(
      [
        invoice({ dueState: "overdue", payoutInr: 1000 }),
        invoice({ dueState: "overdue", payoutInr: null }),
        invoice({ dueState: "on_time", payoutInr: 500.25 }),
        invoice({ dueState: "due_soon", payoutInr: 250 }),
      ],
      "2026-10-17",
    );
    expect(totals).toEqual({
      outstandingInr: 1750.25,
      overdueInr: 1000,
      overdueCount: 2,
      paidLast30Inr: 0,
      paidLast30PayPalInr: 0,
      paidLast30OutsideInr: 0,
    });
  });

  it("totals the invoices paid in the last 30 days from their payout figures", () => {
    const totals = computeTotals(
      [
        invoice({ dueState: "paid", payoutInr: 35617, paidOn: "2026-10-15" }),
        invoice({ dueState: "paid", payoutInr: 22219, paidOn: "2026-10-07" }),
        invoice({ dueState: "paid", payoutInr: 99999, paidOn: "2026-09-17" }),
      ],
      "2026-10-17",
    );
    expect(totals.paidLast30Inr).toBe(57836);
    expect(totals.paidLast30PayPalInr).toBe(57836);
    expect(totals.paidLast30OutsideInr).toBe(0);
    expect(totals.outstandingInr).toBe(0);
  });

  it("keeps the rupees of payments recorded outside PayPal apart from PayPal's", () => {
    const totals = computeTotals(
      [
        invoice({
          dueState: "paid",
          payoutInr: 35617,
          payoutSource: "paypal",
          paidOn: "2026-10-15",
        }),
        invoice({
          dueState: "paid",
          payoutInr: 22219,
          payoutSource: "estimate",
          paidOn: "2026-10-07",
        }),
        invoice({
          dueState: "paid",
          payoutInr: 50000,
          payoutSource: "outside_paypal",
          paidOn: "2026-10-02",
        }),
        invoice({
          dueState: "paid",
          payoutInr: 77777,
          payoutSource: "outside_paypal",
          paidOn: "2026-09-12",
        }),
      ],
      "2026-10-17",
    );
    expect(totals.paidLast30PayPalInr).toBe(57836);
    expect(totals.paidLast30OutsideInr).toBe(50000);
    expect(totals.paidLast30Inr).toBe(107836);
  });

  it("counts the last 30 days as today and the 29 before, in India time", () => {
    const paidOn = (day: string) => invoice({ dueState: "paid", payoutInr: 100, paidOn: day });
    const totals = computeTotals(
      [paidOn("2026-09-18"), paidOn("2026-09-17"), paidOn("2026-10-17"), paidOn("2026-10-18")],
      "2026-10-17",
    );
    expect(totals.paidLast30Inr).toBe(200);
  });

  it("returns zeros for no invoices", () => {
    expect(computeTotals([], "2026-10-17")).toEqual({
      outstandingInr: 0,
      overdueInr: 0,
      overdueCount: 0,
      paidLast30Inr: 0,
      paidLast30PayPalInr: 0,
      paidLast30OutsideInr: 0,
    });
  });
});

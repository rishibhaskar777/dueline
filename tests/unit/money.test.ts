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
      paidThisMonthInr: 0,
    });
  });

  it("totals this month's paid invoices, preferring PayPal's rupee figure", () => {
    const paid = {
      dueState: "paid" as const,
      payoutInr: 35725,
      actualPayout: {
        fee: { currency: "USD" as const, value: "20.10" },
        net: { currency: "USD" as const, value: "429.90" },
        exchangeRate: 82.85,
        netInr: 35617,
        source: "paypal_capture" as const,
      },
    };
    const totals = computeTotals(
      [
        invoice({ ...paid, paidOn: "2026-10-15" }),
        invoice({ dueState: "paid", payoutInr: 22219, paidOn: "2026-10-07" }),
        invoice({ dueState: "paid", payoutInr: 99999, paidOn: "2026-09-30" }),
      ],
      "2026-10-17",
    );
    expect(totals.paidThisMonthInr).toBe(57836);
    expect(totals.outstandingInr).toBe(0);
  });

  it("returns zeros for no invoices", () => {
    expect(computeTotals([], "2026-10-17")).toEqual({
      outstandingInr: 0,
      overdueInr: 0,
      overdueCount: 0,
      paidThisMonthInr: 0,
    });
  });
});

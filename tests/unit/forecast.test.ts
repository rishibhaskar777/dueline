import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/date-math";
import { buildForecast, expectedDate } from "@/lib/insights/forecast";
import type { InvoiceSummary, RiskLevel } from "@/types";
import { openInvoice, overdueInvoice, paidInvoice } from "../support/summaries";

const TODAY = "2026-11-05";

function input(
  invoice: InvoiceSummary,
  payoutInr: number | null,
  riskLevel: RiskLevel | null,
  averageDaysLate = 0,
) {
  return { invoice: { ...invoice, payoutInr, riskLevel }, averageDaysLate };
}

const dueIn = (days: number) => openInvoice(addDays(TODAY, days));

describe("buildForecast", () => {
  it("expects a reliable client on the due date, weighted 0.95", () => {
    const forecast = buildForecast([input(dueIn(10), 10_000, "reliable", 1)], TODAY);
    expect(forecast.buckets[0]).toEqual({
      label: "Next 30 days",
      expectedInr: 9500,
      bestCaseInr: 10_000,
      invoices: 1,
    });
  });

  it("moves a late payer's invoice by their average days late and weighs it 0.7", () => {
    const forecast = buildForecast([input(dueIn(15), 10_000, "late_payer", 20)], TODAY);
    const [first, second] = forecast.buckets;
    expect(first).toMatchObject({ expectedInr: 0, bestCaseInr: 10_000, invoices: 0 });
    expect(second).toMatchObject({ expectedInr: 7000, bestCaseInr: 0, invoices: 1 });
  });

  it("weighs a client to watch 0.85 and shifts them", () => {
    const watch = input(dueIn(2), 1000, "watch", 6);
    expect(expectedDate(watch, TODAY)).toBe("2026-11-13");
    expect(buildForecast([watch], TODAY).buckets[0].expectedInr).toBe(850);
  });

  it("treats a client with no history like one to watch, with no delay", () => {
    const unknown = input(dueIn(4), 1000, null, 0);
    expect(expectedDate(unknown, TODAY)).toBe("2026-11-09");
    expect(buildForecast([unknown], TODAY).buckets[0].expectedInr).toBe(850);
  });

  it("expects an overdue invoice after the days the client is usually late are used up", () => {
    const overdue = input(overdueInvoice("2026-10-26", 10), 5000, "watch", 14);
    expect(expectedDate(overdue, TODAY)).toBe("2026-11-09");
  });

  it("gives an overdue invoice at least 3 days, even for a reliable client", () => {
    const overdue = input(overdueInvoice("2026-10-31", 5), 5000, "reliable", 0);
    expect(expectedDate(overdue, TODAY)).toBe("2026-11-08");
    const pastTheUsualDelay = input(overdueInvoice("2026-10-26", 10), 5000, "late_payer", 7);
    expect(expectedDate(pastTheUsualDelay, TODAY)).toBe("2026-11-08");
  });

  it("weighs an invoice more than 30 days overdue 0.5 and counts its best case today", () => {
    const stale = input(overdueInvoice("2026-09-25", 41), 10_000, "late_payer", 20);
    expect(buildForecast([stale], TODAY).buckets[0]).toMatchObject({
      expectedInr: 5000,
      bestCaseInr: 10_000,
      invoices: 1,
    });
  });

  it("puts the edges of each window in the right bucket and drops what is later", () => {
    const at = (days: number) => input(dueIn(days), 100, "reliable");
    const { buckets } = buildForecast([30, 31, 60, 61, 90, 91].map(at), TODAY);
    expect(buckets.map(({ invoices }) => invoices)).toEqual([1, 2, 2]);
    expect(buckets.map(({ bestCaseInr }) => bestCaseInr)).toEqual([100, 200, 200]);
  });

  it("leaves out paid invoices and invoices without rupees", () => {
    const forecast = buildForecast(
      [
        input(paidInvoice("2026-10-01", "2026-10-02"), 9000, "reliable"),
        input(dueIn(5), null, "reliable"),
      ],
      TODAY,
    );
    expect(forecast.buckets.every(({ invoices }) => invoices === 0)).toBe(true);
  });

  it("is three empty buckets with the basis line when there is nothing to forecast", () => {
    const forecast = buildForecast([], TODAY);
    expect(forecast.buckets.map(({ label }) => label)).toEqual([
      "Next 30 days",
      "31 to 60 days",
      "61 to 90 days",
    ]);
    expect(
      forecast.buckets.every(({ expectedInr, bestCaseInr }) => !expectedInr && !bestCaseInr),
    ).toBe(true);
    expect(forecast.basis).toBe(
      "Weighted by each client's payment history. Best case assumes everyone pays on time.",
    );
  });
});

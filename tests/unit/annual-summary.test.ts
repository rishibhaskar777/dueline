import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/exports/annual/route";
import { buildAnnualSummary } from "@/lib/export/annual";
import { toAnnualCsv } from "@/lib/export/annual-csv";
import type { LoadedInvoice } from "@/lib/paypal/summaries";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { haldenLabelsInvoice, okaforInvoice } from "@/mocks/fixtures";
import type { AnnualSummary, InvoiceSummary } from "@/types";
import { stubEnv } from "../support/env";
import { ecbByDate } from "../support/ecb-by-date";

const holder = vi.hoisted(() => ({ store: undefined as Store | undefined }));
const paypal = vi.hoisted(() => ({ loadInvoices: vi.fn() }));
vi.mock("@/lib/store", () => ({ getStore: () => holder.store }));
vi.mock("@/lib/paypal/summaries", () => ({ loadInvoices: paypal.loadInvoices }));

// USD is 85 rupees on every date, EUR 102.
function loaded(summary: InvoiceSummary): LoadedInvoice {
  return { summary, amountDue: summary.amount, underLut: false, sac: null, paymentId: null };
}

// An invoice recorded as paid outside PayPal: no fee, no markup.
function outside(overrides: Partial<InvoiceSummary>): LoadedInvoice {
  return loaded({
    ...okaforInvoice,
    paypalStatus: "MARKED_AS_PAID",
    dueState: "paid",
    actualPayout: null,
    amount: { currency: "USD", value: "100.00" },
    paidOn: "2026-10-12",
    ...overrides,
  });
}

function serve(...invoices: LoadedInvoice[]): void {
  paypal.loadInvoices.mockResolvedValue(invoices);
}

beforeEach(() => {
  stubEnv({ DEMO_TODAY: "2027-05-10" });
  holder.store = createMemoryStore();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(ecbByDate({}));
});

afterEach(() => vi.restoreAllMocks());

describe("buildAnnualSummary", () => {
  it("counts a payment on 31 March in that year and one on 1 April in the next", async () => {
    serve(
      outside({ id: "a", paidOn: "2026-03-31" }),
      outside({ id: "b", paidOn: "2026-04-01" }),
      outside({ id: "c", paidOn: "2027-03-31" }),
      outside({ id: "d", paidOn: "2027-04-01" }),
    );

    expect((await buildAnnualSummary("2026-27")).invoiceCount).toBe(2);
    expect((await buildAnnualSummary("2025-26")).invoiceCount).toBe(1);
    expect((await buildAnnualSummary("2027-28")).invoiceCount).toBe(1);
  });

  it("gives the year's first and last day", async () => {
    serve();
    expect(await buildAnnualSummary("2026-27")).toMatchObject({
      fy: "2026-27",
      from: "2026-04-01",
      to: "2027-03-31",
    });
  });

  it("keeps receipts recorded outside PayPal apart, with no fee or conversion loss", async () => {
    serve(outside({ id: "a" }));
    expect(await buildAnnualSummary("2026-27")).toMatchObject({
      receivedPayPalInr: 0,
      receivedOutsideInr: 8500,
      paypalFeesInr: 0,
      conversionLossInr: 0,
      grossReceiptsInr: 8500,
    });
  });

  it("splits what PayPal took into its fee and the conversion loss, adding up to the market value", async () => {
    // $450.00 is 38,250 at 85. PayPal paid out 35,617, and its fee of $20.10 is 1,709 of the
    // 2,633 that is missing.
    serve(loaded({ ...haldenLabelsInvoice, paidOn: "2026-10-15" }));
    expect(await buildAnnualSummary("2026-27")).toMatchObject({
      receivedPayPalInr: 35617,
      receivedOutsideInr: 0,
      paypalFeesInr: 1709,
      conversionLossInr: 924,
      grossReceiptsInr: 38250,
    });
  });

  it("estimates the fee from the settings when PayPal has not reported one", async () => {
    serve(loaded({ ...haldenLabelsInvoice, actualPayout: null, paidOn: "2026-10-15" }));

    const result = await buildAnnualSummary("2026-27");
    // $450 less 4.4% and $0.30 is $429.90 net, which at 82.45 (85 less the 3% markup) is 35,445 rupees.
    expect(result.receivedPayPalInr).toBe(35445);
    expect(result.paypalFeesInr).toBe(1709);
    expect(result.grossReceiptsInr).toBe(38250);
  });

  it("leaves out unpaid and partly paid invoices", async () => {
    serve(
      loaded({ ...okaforInvoice, paidOn: null }),
      loaded({ ...okaforInvoice, id: "b", paypalStatus: "PARTIALLY_PAID", paidOn: null }),
    );
    expect((await buildAnnualSummary("2026-27")).invoiceCount).toBe(0);
  });

  it("takes half of the gross receipts as presumptive income", async () => {
    serve(outside({ id: "a" }), outside({ id: "b", amount: { currency: "USD", value: "50.01" } }));
    // 8,500 and 4,251 (50.01 at 85 is 4,250.85).
    const result = await buildAnnualSummary("2026-27");
    expect(result.grossReceiptsInr).toBe(12751);
    expect(result.presumptiveIncomeInr).toBe(6376);
  });

  it("counts a client once however its name is spaced or capitalised", async () => {
    serve(
      outside({ id: "a", client: { name: "Halden Coffee Co.", email: "a@x.example" } }),
      outside({ id: "b", client: { name: "  halden  coffee co. ", email: "b@x.example" } }),
      outside({ id: "c", client: { name: "Brightwell Labs", email: "c@x.example" } }),
    );
    const result = await buildAnnualSummary("2026-27");
    expect(result.invoiceCount).toBe(3);
    expect(result.clientCount).toBe(2);
  });

  it("warns only when gross receipts pass 75 lakh", async () => {
    serve(outside({ id: "a", amount: { currency: "USD", value: "80000.00" } }));
    expect(await buildAnnualSummary("2026-27")).toMatchObject({
      grossReceiptsInr: 6_800_000,
      presumptiveLimitInr: 7_500_000,
      overLimit: false,
    });

    serve(outside({ id: "a", amount: { currency: "USD", value: "90000.00" } }));
    expect(await buildAnnualSummary("2026-27")).toMatchObject({
      grossReceiptsInr: 7_650_000,
      overLimit: true,
    });
  });
});

describe("toAnnualCsv", () => {
  const summary: AnnualSummary = {
    fy: "2026-27",
    from: "2026-04-01",
    to: "2027-03-31",
    receivedPayPalInr: 35617,
    receivedOutsideInr: 8500,
    paypalFeesInr: 1709,
    conversionLossInr: 924,
    grossReceiptsInr: 46750,
    presumptiveIncomeInr: 23375,
    presumptiveLimitInr: 7_500_000,
    overLimit: false,
    invoiceCount: 4,
    clientCount: 2,
  };

  function lines(csv: string): string[] {
    return csv.replace(/^﻿/, "").split("\r\n");
  }

  it("labels the figures as an estimate and lists each total", () => {
    const csv = lines(toAnnualCsv(summary));
    expect(csv[0]).toBe("Estimate. Confirm with your CA.");
    expect(csv).toContain("Financial year,2026-27");
    expect(csv).toContain("Gross receipts (INR),46750");
    expect(csv).toContain('"Section 44ADA presumptive income, 50% (INR)",23375');
    expect(csv).toContain("Clients,2");
  });

  it("adds the 44ADA warning only over the limit", () => {
    expect(toAnnualCsv(summary)).not.toContain("Warning");
    expect(toAnnualCsv({ ...summary, overLimit: true })).toContain("Warning,");
  });
});

describe("GET /api/exports/annual", () => {
  function get(query: string): Promise<Response> {
    return GET(new Request(`http://localhost:3000/api/exports/annual?${query}`));
  }

  it("returns the summary as JSON", async () => {
    serve(outside({ id: "a" }));
    const response = await get("fy=2026-27");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ fy: "2026-27", receivedOutsideInr: 8500 });
  });

  it("returns the same figures as a CSV attachment", async () => {
    serve(outside({ id: "a" }));
    const response = await get("fy=2026-27&format=csv");
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="dueline-year-summary-2026-27.csv"',
    );
    expect(await response.text()).toContain("Gross receipts (INR),8500");
  });

  it.each(["fy=2026", "fy=2026-28", "fy=26-27", ""])("refuses the year %j", async (query) => {
    expect((await get(query)).status).toBe(400);
  });

  it("refuses a financial year that has not started", async () => {
    const response = await get("fy=2028-29");
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toContain("2027-28");
  });
});

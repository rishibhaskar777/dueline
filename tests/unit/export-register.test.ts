import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildExportRegister } from "@/lib/export/register";
import type { LoadedInvoice } from "@/lib/paypal/summaries";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import {
  brightwellInvoice,
  haldenLabelsInvoice,
  haldenMenuInvoice,
  okaforInvoice,
} from "@/mocks/fixtures";
import type { ActualPayout, InvoiceSummary } from "@/types";
import { stubEnv } from "../support/env";
import { ecbResponse } from "../support/rates";

const holder = vi.hoisted(() => ({ store: undefined as Store | undefined }));
const paypal = vi.hoisted(() => ({ loadInvoices: vi.fn() }));
vi.mock("@/lib/store", () => ({ getStore: () => holder.store }));
vi.mock("@/lib/paypal/summaries", () => ({ loadInvoices: paypal.loadInvoices }));

const netOnly: ActualPayout = {
  fee: { currency: "USD", value: "12.62" },
  net: { currency: "USD", value: "267.38" },
  exchangeRate: null,
  netInr: null,
  source: "invoice_payment",
  paidAt: "2026-10-06T20:00:00Z",
  transactionId: "7AB00000CD1111111",
};

function loaded(
  summary: InvoiceSummary,
  underLut = false,
  paymentId: string | null = null,
): LoadedInvoice {
  return { summary, amountDue: summary.amount, underLut, paymentId };
}

function serve(...invoices: LoadedInvoice[]): void {
  paypal.loadInvoices.mockResolvedValue(invoices);
}

// The dates the rate service was asked for; the call for the latest rates has none.
function datesAskedOf(fetch: { mock: { calls: unknown[][] } }): string[] {
  return fetch.mock.calls.flatMap(([url]) => {
    const date = new URL(String(url)).searchParams.get("date");
    return date ? [date] : [];
  });
}

beforeEach(() => {
  stubEnv({ DEMO_TODAY: "2026-10-30" });
  holder.store = createMemoryStore();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => ecbResponse("2026-10-06"));
});

afterEach(() => vi.restoreAllMocks());

describe("buildExportRegister", () => {
  it("lists the invoices paid in the month by paid date, then invoice number", async () => {
    serve(
      loaded({ ...haldenLabelsInvoice, number: "INV-0050", paidOn: "2026-10-15" }),
      loaded({ ...haldenMenuInvoice, number: "INV-0049", paidOn: "2026-10-15" }),
      loaded({ ...haldenMenuInvoice, id: "early", number: "INV-0060", paidOn: "2026-10-01" }),
      loaded({ ...haldenMenuInvoice, id: "september", paidOn: "2026-09-30" }),
      loaded({ ...haldenMenuInvoice, id: "november", paidOn: "2026-11-01" }),
      loaded(brightwellInvoice),
    );

    const register = await buildExportRegister("2026-10");
    expect(register.month).toBe("2026-10");
    expect(register.rows.map((row) => row.invoiceNumber)).toEqual([
      "INV-0060",
      "INV-0049",
      "INV-0050",
    ]);
  });

  it("leaves out a partly paid invoice, which has no paid date until it is paid in full", async () => {
    serve(loaded({ ...okaforInvoice, paypalStatus: "PARTIALLY_PAID", paidOn: null }));
    expect((await buildExportRegister("2026-10")).rows).toEqual([]);
  });

  it("shows PayPal's own figures and does not ask for a rate", async () => {
    const fetch = vi.mocked(globalThis.fetch);
    serve(loaded(haldenLabelsInvoice, true));

    const [row] = (await buildExportRegister("2026-10")).rows;
    expect(row).toEqual({
      invoiceId: haldenLabelsInvoice.id,
      invoiceNumber: "INV-0042",
      clientName: "Halden Coffee Co.",
      clientCountry: "United States",
      paidOn: "2026-10-15",
      foreign: { currency: "USD", value: "450.00" },
      fee: { currency: "USD", value: "20.10" },
      net: { currency: "USD", value: "429.90" },
      inrReceived: 35617,
      inrSource: "paypal",
      rateUsed: null,
      rateDate: null,
      purposeCode: "P1099",
      underLut: true,
      transactionId: "5GX12345AB6789012",
    });
    expect(datesAskedOf(fetch)).toEqual([]);
  });

  it("rounds the rupees PayPal reports to whole rupees", async () => {
    const actualPayout = { ...haldenLabelsInvoice.actualPayout, netInr: 35617.5 } as ActualPayout;
    serve(loaded({ ...haldenLabelsInvoice, actualPayout }));
    expect((await buildExportRegister("2026-10")).rows[0].inrReceived).toBe(35618);
  });

  it("converts PayPal's net at the ECB rate of the paid date less the markup", async () => {
    const fetch = vi.mocked(globalThis.fetch);
    serve(loaded({ ...haldenMenuInvoice, paidOn: "2026-10-07", actualPayout: netOnly }));

    const [row] = (await buildExportRegister("2026-10")).rows;
    // USD is 85 rupees at the ECB, 82.45 after PayPal's 3% markup: 267.38 x 82.45.
    expect(row).toMatchObject({
      fee: netOnly.fee,
      net: netOnly.net,
      inrReceived: 22045,
      inrSource: "estimate",
      rateUsed: 82.45,
      rateDate: "2026-10-06",
      transactionId: "7AB00000CD1111111",
    });
    expect(datesAskedOf(fetch)).toContain("2026-10-07");
  });

  it("estimates an invoice PayPal has reported nothing for from the published fees", async () => {
    serve(loaded({ ...haldenMenuInvoice, actualPayout: null }));

    const [row] = (await buildExportRegister("2026-10")).rows;
    expect(row).toMatchObject({
      fee: null,
      net: null,
      transactionId: null,
      inrSource: "estimate",
      inrReceived: 22045,
      rateUsed: 82.45,
    });
  });

  it("falls back to the invoice's own payment ID when PayPal reported no payout figures", async () => {
    serve(loaded({ ...haldenMenuInvoice, actualPayout: null }, false, "9PAYMENT0000001"));
    expect((await buildExportRegister("2026-10")).rows[0].transactionId).toBe("9PAYMENT0000001");
  });

  it("prefers the transaction ID PayPal reported over the invoice's payment ID", async () => {
    serve(loaded({ ...haldenMenuInvoice, actualPayout: netOnly }, false, "9PAYMENT0000001"));
    expect((await buildExportRegister("2026-10")).rows[0].transactionId).toBe("7AB00000CD1111111");
  });

  it("asks for each date's rate once", async () => {
    const fetch = vi.mocked(globalThis.fetch);
    serve(
      loaded({
        ...haldenMenuInvoice,
        id: "a",
        number: "INV-1",
        paidOn: "2026-10-07",
        actualPayout: null,
      }),
      loaded({
        ...haldenMenuInvoice,
        id: "b",
        number: "INV-2",
        paidOn: "2026-10-07",
        actualPayout: null,
      }),
      loaded({
        ...haldenMenuInvoice,
        id: "c",
        number: "INV-3",
        paidOn: "2026-10-08",
        actualPayout: null,
      }),
    );
    await buildExportRegister("2026-10");
    expect(datesAskedOf(fetch).sort()).toEqual(["2026-10-07", "2026-10-08"]);
  });

  it("totals the month in whole rupees and per currency, and counts missing purpose codes", async () => {
    serve(
      loaded(haldenLabelsInvoice),
      loaded({ ...haldenMenuInvoice, actualPayout: null, purposeCode: null }),
      loaded({
        ...haldenMenuInvoice,
        id: "pounds",
        paidOn: "2026-10-20",
        amount: { currency: "GBP", value: "100.50" },
        actualPayout: null,
      }),
      loaded({
        ...haldenMenuInvoice,
        id: "more-dollars",
        paidOn: "2026-10-21",
        actualPayout: null,
      }),
    );

    const register = await buildExportRegister("2026-10");
    expect(register.totalsByCurrency).toEqual([
      { currency: "USD", value: "1010.00" },
      { currency: "GBP", value: "100.50" },
    ]);
    expect(register.paypalInr).toBe(35617);
    expect(register.paypalInr + register.estimatedInr).toBe(register.totalInr);
    expect(register.estimatedInr).toBeGreaterThan(0);
    expect(register.totalInr).toBe(register.rows.reduce((sum, row) => sum + row.inrReceived, 0));
    expect(Number.isInteger(register.totalInr)).toBe(true);
    expect(register.missingPurposeCodes).toBe(1);
  });

  it("returns an empty register for a month with no paid invoices", async () => {
    serve(loaded(brightwellInvoice));
    expect(await buildExportRegister("2026-09")).toEqual({
      month: "2026-09",
      rows: [],
      totalInr: 0,
      totalsByCurrency: [],
      paypalInr: 0,
      estimatedInr: 0,
      missingPurposeCodes: 0,
    });
  });

  it("takes a country from the last part of the client's location", async () => {
    const client = { ...haldenLabelsInvoice.client, location: "Austin, Texas, United States" };
    serve(loaded({ ...haldenLabelsInvoice, client }));
    expect((await buildExportRegister("2026-10")).rows[0].clientCountry).toBe("United States");

    serve(loaded({ ...haldenLabelsInvoice, client: { ...client, location: undefined } }));
    expect((await buildExportRegister("2026-10")).rows[0].clientCountry).toBeNull();
  });
});

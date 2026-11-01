import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getInvoices } from "@/app/api/invoices/route";
import { buildExportRegister } from "@/lib/export/register";
import { convertToInr, paypalRateFor } from "@/lib/money/payout";
import type { LoadedInvoice } from "@/lib/paypal/summaries";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { haldenMenuInvoice } from "@/mocks/fixtures";
import { DEFAULT_SETTINGS, type ActualPayout, type InvoiceSummary } from "@/types";
import { stubEnv } from "../support/env";
import { jsonResponse } from "../support/http";
import { ecbResponse } from "../support/rates";

const holder = vi.hoisted(() => ({ store: undefined as Store | undefined }));
const paypal = vi.hoisted(() => ({ loadInvoices: vi.fn() }));
vi.mock("@/lib/store", () => ({ getStore: () => holder.store }));
vi.mock("@/lib/paypal/summaries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/paypal/summaries")>()),
  loadInvoices: paypal.loadInvoices,
}));

// PayPal gave its net but no rupees, the case the old Receivables and Export converted differently.
const netOnly: ActualPayout = {
  fee: { currency: "USD", value: "12.62" },
  net: { currency: "USD", value: "267.38" },
  exchangeRate: null,
  netInr: null,
  source: "invoice_payment",
  paidAt: "2026-10-06T20:00:00Z",
  transactionId: "7AB00000CD1111111",
};

const PAID_DAY_USD_RATE = 80;

// The ECB's rupees per euro over dollars per euro: USD 85 today, 80 on the day of the payment.
function ratesFor(url: URL): Response {
  if (url.searchParams.get("date") === "2026-10-06") {
    return jsonResponse(
      [
        ["INR", 100],
        ["USD", 1.25],
        ["GBP", 0.8],
        ["CAD", 1.6],
        ["AUD", 1.8],
      ].map(([quote, rate]) => ({ date: "2026-10-06", base: "EUR", quote, rate })),
    );
  }
  return ecbResponse("2026-10-30");
}

function serve(...summaries: InvoiceSummary[]): void {
  paypal.loadInvoices.mockResolvedValue(
    summaries.map((summary): LoadedInvoice => ({
      summary,
      amountDue: summary.amount,
      underLut: false,
      sac: null,
      paymentId: null,
      marker: "dueline-request:test",
    })),
  );
}

beforeEach(() => {
  stubEnv({ DEMO_TODAY: "2026-10-30" });
  holder.store = createMemoryStore();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
    ratesFor(new URL(String(input))),
  );
});

afterEach(() => vi.restoreAllMocks());

describe("the rupees of one payment", () => {
  const tandemLike: InvoiceSummary = {
    ...haldenMenuInvoice,
    paidOn: "2026-10-06",
    actualPayout: netOnly,
  };

  it("are the same number in Receivables and in the export register", async () => {
    serve(tandemLike);

    const { invoices } = await (await getInvoices()).json();
    const register = await buildExportRegister("2026-10");

    const expected = convertToInr(netOnly.net, paypalRateFor(PAID_DAY_USD_RATE, 3));
    expect(invoices[0].payoutInr).toBe(expected);
    expect(register.rows[0].inrReceived).toBe(expected);
    expect(invoices[0]).toMatchObject({ payoutSource: "estimate", rateDate: "2026-10-06" });
    expect(register.rows[0].rateDate).toBe("2026-10-06");
  });

  it("is converted at the rate of the payment date, not today's", async () => {
    serve(tandemLike);
    const { invoices } = await (await getInvoices()).json();
    const atTodaysRate = convertToInr(
      netOnly.net,
      paypalRateFor(85, DEFAULT_SETTINGS.fxMarkupPercent),
    );
    expect(invoices[0].payoutInr).not.toBe(atTodaysRate);
  });

  it("is PayPal's own figure in both when PayPal reported the rupees", async () => {
    serve({ ...tandemLike, actualPayout: { ...netOnly, netInr: 21499.4 } });

    const { invoices } = await (await getInvoices()).json();
    const register = await buildExportRegister("2026-10");

    expect(invoices[0]).toMatchObject({ payoutInr: 21499, payoutSource: "paypal", rateDate: null });
    expect(register.rows[0]).toMatchObject({ inrReceived: 21499, inrSource: "paypal" });
  });

  it("leaves a payment recorded outside PayPal in Receivables only, at the paid day's rate", async () => {
    serve({ ...tandemLike, paypalStatus: "MARKED_AS_PAID", actualPayout: null });

    const body = await (await getInvoices()).json();
    const register = await buildExportRegister("2026-10");

    expect(body.invoices[0]).toMatchObject({
      payoutInr: convertToInr(tandemLike.amount, PAID_DAY_USD_RATE),
      payoutSource: "outside_paypal",
    });
    expect(body.totals).toMatchObject({
      paidLast30PayPalInr: 0,
      paidLast30OutsideInr: convertToInr(tandemLike.amount, PAID_DAY_USD_RATE),
    });
    expect(register.rows).toEqual([]);
    expect(register.outsideRows.map((row) => row.invoiceNumber)).toEqual([tandemLike.number]);
    expect(register.bankInr).toBe(convertToInr(tandemLike.amount, PAID_DAY_USD_RATE));
    expect(register.paypalFiraInr).toBe(0);
  });
});

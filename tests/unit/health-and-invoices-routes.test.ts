import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getHealth } from "@/app/api/health/route";
import { GET as getInvoices } from "@/app/api/invoices/route";
import { clearInvoiceCaches } from "@/lib/paypal/summaries";
import { clearAccessToken } from "@/lib/paypal/token";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { stubEnv } from "../support/env";
import { jsonResponse, mockPayPal, TOKEN_PATH } from "../support/http";
import { ecbResponse, isRatesRequest } from "../support/rates";
import paidFixture from "../fixtures/paypal/invoice-paid.json";
import unpaidFixture from "../fixtures/paypal/invoice-unpaid.json";

const sdk = vi.hoisted(() => ({
  getCapturedPayment: vi.fn(),
  searchTransactions: vi.fn(),
}));

vi.mock("@/lib/paypal/sdk", () => ({
  paymentsController: () => ({ getCapturedPayment: sdk.getCapturedPayment }),
  transactionSearchController: () => ({ searchTransactions: sdk.searchTransactions }),
}));

const unpaid = unpaidFixture as PayPalInvoice;
const paid = paidFixture as PayPalInvoice;

beforeEach(() => {
  stubEnv({ DEMO_TODAY: "2026-10-17" });
  clearAccessToken();
  clearInvoiceCaches();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("GET /api/health", () => {
  it("reports a connected sandbox", async () => {
    mockPayPal(() => jsonResponse({}));
    const response = await getHealth();
    expect(await response.json()).toEqual({
      paypal: "connected",
      ai: "missing_key",
      storage: "memory",
      mode: "sandbox",
      today: "2026-10-17",
      demoClock: true,
    });
  });

  it("reports ready AI when a key is set", async () => {
    stubEnv({ GEMINI_API_KEY: "test-key" });
    mockPayPal(() => jsonResponse({}));
    expect((await (await getHealth()).json()).ai).toBe("ready");
  });

  it("reports a PayPal error when no token can be fetched", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      expect(new URL(String(input)).pathname).toBe(TOKEN_PATH);
      return jsonResponse({ name: "invalid_client", debug_id: "tok1" }, { status: 401 });
    });
    const response = await getHealth();
    expect(response.status).toBe(200);
    expect((await response.json()).paypal).toBe("error");
  });

  it("does not throw when the configuration is invalid", async () => {
    stubEnv({ PAYPAL_CLIENT_ID: "" });
    const body = await (await getHealth()).json();
    expect(body).toMatchObject({ paypal: "error", ai: "missing_key", storage: "error" });
    expect(body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.demoClock).toBe(false);
  });
});

const SINGLE_INVOICE = /^\/v2\/invoicing\/invoices\/(.+)$/;

// The list leaves out items and the payer link, as PayPal's does; reading one invoice has them.
function serveInvoices(...invoices: PayPalInvoice[]): void {
  mockPayPal((url) => {
    if (isRatesRequest(url)) return ecbResponse();
    const single = SINGLE_INVOICE.exec(url.pathname);
    if (single) {
      return jsonResponse(invoices.find((invoice) => invoice.id === single[1]) ?? {});
    }
    const bare = invoices.map((invoice) => ({
      ...invoice,
      items: undefined,
      detail: { ...invoice.detail, metadata: undefined },
    }));
    return jsonResponse({ items: bare, total_items: bare.length, total_pages: 1 });
  });
}

describe("GET /api/invoices", () => {
  it("maps, filters and sorts PayPal's invoices and totals the rupees", async () => {
    sdk.getCapturedPayment.mockResolvedValue({
      result: {
        sellerReceivableBreakdown: {
          grossAmount: { currencyCode: "USD", value: "450.00" },
          paypalFee: { currencyCode: "USD", value: "20.10" },
          netAmount: { currencyCode: "USD", value: "429.90" },
          receivableAmount: { currencyCode: "INR", value: "35617.00" },
        },
      },
    });
    const draft: PayPalInvoice = { ...unpaid, id: "draft", status: "DRAFT" };
    serveInvoices(paid, draft, unpaid);

    const response = await getInvoices();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.invoices.map((invoice: { number: string }) => invoice.number)).toEqual([
      "INV-0101",
      "INV-0102",
    ]);
    expect(body.invoices[0]).toMatchObject({
      work: "Pitch deck design",
      payLink: "https://www.sandbox.paypal.com/invoice/p/#TEST0001",
      payoutInr: 70915,
    });
    expect(body.invoices.map((invoice: { riskLevel: unknown }) => invoice.riskLevel)).toEqual([
      null,
      "reliable",
    ]);
    expect(body.invoices[1].actualPayout.netInr).toBe(35617);
    expect(body.invoices[1].payoutInr).toBe(35617);
    expect(body.totals).toEqual({
      outstandingInr: 70915,
      overdueInr: 0,
      overdueCount: 0,
      paidThisMonthPayPalInr: 35617,
      paidThisMonthOutsideInr: 0,
    });
  });

  it("estimates the amount still due on a partly paid invoice", async () => {
    serveInvoices({
      ...unpaid,
      status: "PARTIALLY_PAID",
      detail: {
        ...unpaid.detail,
        payment_term: { term_type: "DUE_ON_DATE_SPECIFIED", due_date: "2026-10-10" },
      },
      payments: { paid_amount: { currency_code: "USD", value: "400.00" } },
    });

    const body = await (await getInvoices()).json();
    expect(body.invoices[0].payoutInr).toBe(39386);
    expect(body.invoices[0].riskLevel).toBe("watch");
    expect(body.totals).toMatchObject({
      outstandingInr: 39386,
      overdueInr: 39386,
      overdueCount: 1,
    });
  });

  it("answers 502 paypal_error with the debug id when PayPal fails", async () => {
    mockPayPal(() =>
      jsonResponse(
        { name: "INTERNAL_SERVER_ERROR", message: "Try later.", debug_id: "dbg789" },
        { status: 500 },
      ),
    );
    const response = await getInvoices();
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: {
        code: "paypal_error",
        message: "PayPal returned an error: Try later.",
        debugId: "dbg789",
      },
    });
  });

  it("answers 500 config_error naming the setting", async () => {
    stubEnv({ PAYPAL_CLIENT_SECRET: "" });
    const response = await getInvoices();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "config_error",
        message: "Missing or invalid settings: PAYPAL_CLIENT_SECRET.",
      },
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getActualPayout } from "@/lib/paypal/payments";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { stubEnv } from "../support/env";
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

const paid = paidFixture as PayPalInvoice;

const searchResult = {
  result: {
    transactionDetails: [
      {
        transactionInfo: {
          transactionInitiationDate: "2026-10-15T11:42:00+0000",
          feeAmount: { currencyCode: "USD", value: "-20.10" },
          transactionAmount: { currencyCode: "USD", value: "450.00" },
        },
      },
    ],
  },
};

describe("getActualPayout", () => {
  beforeEach(() => {
    stubEnv();
    vi.resetAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("maps the capture's seller receivable breakdown", async () => {
    sdk.getCapturedPayment.mockResolvedValue({
      result: {
        createTime: "2026-10-15T11:42:00Z",
        sellerReceivableBreakdown: {
          grossAmount: { currencyCode: "USD", value: "450.00" },
          paypalFee: { currencyCode: "USD", value: "20.10" },
          netAmount: { currencyCode: "USD", value: "429.90" },
          receivableAmount: { currencyCode: "INR", value: "35617.00" },
          exchangeRate: { sourceCurrency: "USD", targetCurrency: "INR", value: "82.85" },
        },
      },
    });

    expect(await getActualPayout(paid)).toEqual({
      fee: { currency: "USD", value: "20.10" },
      net: { currency: "USD", value: "429.90" },
      exchangeRate: 82.85,
      netInr: 35617,
      source: "paypal_capture",
      paidAt: "2026-10-15T11:42:00Z",
      transactionId: "5GX12345AB6789012",
    });
    expect(sdk.getCapturedPayment).toHaveBeenCalledWith({ captureId: "5GX12345AB6789012" });
    expect(sdk.searchTransactions).not.toHaveBeenCalled();
  });

  it("leaves the paid time empty when PayPal gives none", async () => {
    sdk.getCapturedPayment.mockResolvedValue({
      result: {
        sellerReceivableBreakdown: {
          paypalFee: { currencyCode: "USD", value: "20.10" },
          netAmount: { currencyCode: "USD", value: "429.90" },
        },
      },
    });
    expect(await getActualPayout(paid)).toMatchObject({
      paidAt: null,
      transactionId: "5GX12345AB6789012",
    });
  });

  it("falls back to transaction search when the capture has no breakdown", async () => {
    sdk.getCapturedPayment.mockResolvedValue({ result: {} });
    sdk.searchTransactions.mockResolvedValue(searchResult);

    expect(await getActualPayout(paid)).toEqual({
      fee: { currency: "USD", value: "20.10" },
      net: { currency: "USD", value: "429.90" },
      exchangeRate: null,
      netInr: null,
      source: "invoice_payment",
      paidAt: "2026-10-15T11:42:00+0000",
      transactionId: "5GX12345AB6789012",
    });
    expect(sdk.searchTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: "5GX12345AB6789012",
        startDate: "2026-09-30T00:00:00Z",
        endDate: "2026-10-30T23:59:59Z",
      }),
    );
  });

  it("falls back to transaction search when the capture lookup fails", async () => {
    sdk.getCapturedPayment.mockRejectedValue(new Error("not found"));
    sdk.searchTransactions.mockResolvedValue(searchResult);
    expect((await getActualPayout(paid))?.source).toBe("invoice_payment");
  });

  it("returns null when both lookups fail", async () => {
    sdk.getCapturedPayment.mockRejectedValue(new Error("not found"));
    sdk.searchTransactions.mockRejectedValue(new Error("not enabled"));
    expect(await getActualPayout(paid)).toBeNull();
  });

  it("returns null when the search finds no fee", async () => {
    sdk.getCapturedPayment.mockResolvedValue({ result: {} });
    sdk.searchTransactions.mockResolvedValue({ result: { transactionDetails: [] } });
    expect(await getActualPayout(paid)).toBeNull();
  });

  it("does not look up an invoice that is not paid", async () => {
    expect(await getActualPayout(unpaidFixture as PayPalInvoice)).toBeNull();
    expect(sdk.getCapturedPayment).not.toHaveBeenCalled();
  });
});

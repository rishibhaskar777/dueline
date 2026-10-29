import { describe, expect, it } from "vitest";
import { payoutInrFor } from "@/lib/money/invoice-payout";
import { tandemInvoice } from "@/mocks/fixtures";
import {
  DEFAULT_SETTINGS,
  type ActualPayout,
  type InvoiceSummary,
  type MarketRates,
} from "@/types";

const market: MarketRates = {
  rates: { ...DEFAULT_SETTINGS.marketRates, USD: 88 },
  onDate: "2026-10-28",
  source: "ecb",
};

const unpaid: InvoiceSummary = {
  ...tandemInvoice,
  amount: { currency: "USD", value: "100.00" },
};

const paid: InvoiceSummary = { ...unpaid, dueState: "paid", paidOn: "2026-10-15" };

const sandboxPayout: ActualPayout = {
  fee: { currency: "USD", value: "4.96" },
  net: { currency: "USD", value: "95.04" },
  exchangeRate: null,
  netInr: null,
  source: "paypal_capture",
};

describe("payoutInrFor", () => {
  it("estimates an unpaid invoice from its full amount", () => {
    expect(payoutInrFor(unpaid, unpaid.amount, DEFAULT_SETTINGS, market)).toBe(8135);
  });

  it("estimates a partly paid invoice from what is still due", () => {
    const due = { currency: "USD" as const, value: "50.00" };
    expect(payoutInrFor(unpaid, due, DEFAULT_SETTINGS, market)).toBe(4055);
  });

  it("uses the rupees PayPal reports for a paid invoice", () => {
    const actual = { ...sandboxPayout, exchangeRate: 82.85, netInr: 7874 };
    expect(
      payoutInrFor({ ...paid, actualPayout: actual }, unpaid.amount, DEFAULT_SETTINGS, market),
    ).toBe(7874);
  });

  it("converts PayPal's net at the estimated PayPal rate when no rupees are reported", () => {
    const invoice = { ...paid, actualPayout: sandboxPayout };
    expect(
      payoutInrFor(invoice, { ...unpaid.amount, value: "0.00" }, DEFAULT_SETTINGS, market),
    ).toBe(8113);
  });

  it("estimates a paid invoice without PayPal's figures from its full amount", () => {
    expect(payoutInrFor(paid, { ...unpaid.amount, value: "0.00" }, DEFAULT_SETTINGS, market)).toBe(
      8135,
    );
  });
});

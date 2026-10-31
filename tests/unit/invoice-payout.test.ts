import { describe, expect, it } from "vitest";
import { payoutFor, rateDateFor } from "@/lib/money/invoice-payout";
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
  paidAt: "2026-10-15T11:42:00Z",
  transactionId: "5GX12345AB6789012",
};

const noDue = { currency: "USD" as const, value: "0.00" };

describe("payoutFor", () => {
  it("estimates an unpaid invoice from its full amount at today's rate", () => {
    expect(payoutFor(unpaid, unpaid.amount, DEFAULT_SETTINGS, market)).toEqual({
      inr: 8135,
      source: "estimate",
      rateUsed: 85.36,
      rateDate: "2026-10-28",
    });
  });

  it("estimates a partly paid invoice from what is still due", () => {
    const due = { currency: "USD" as const, value: "50.00" };
    expect(payoutFor(unpaid, due, DEFAULT_SETTINGS, market).inr).toBe(4055);
  });

  it("uses the rupees PayPal reports for a paid invoice, whatever the rate", () => {
    const actual = { ...sandboxPayout, exchangeRate: 82.85, netInr: 7874 };
    expect(payoutFor({ ...paid, actualPayout: actual }, noDue, DEFAULT_SETTINGS, market)).toEqual({
      inr: 7874,
      source: "paypal",
      rateUsed: null,
      rateDate: null,
    });
  });

  it("converts PayPal's net at the paid day's rate less the markup when no rupees are reported", () => {
    const invoice = { ...paid, actualPayout: sandboxPayout };
    expect(payoutFor(invoice, noDue, DEFAULT_SETTINGS, market)).toMatchObject({
      inr: 8113,
      source: "estimate",
      rateDate: "2026-10-28",
    });
  });

  it("estimates a paid invoice without PayPal's figures from its full amount", () => {
    expect(payoutFor(paid, noDue, DEFAULT_SETTINGS, market).inr).toBe(8135);
  });

  it("takes no fee and no markup from a payment recorded outside PayPal", () => {
    const outside = { ...paid, paypalStatus: "MARKED_AS_PAID", actualPayout: null };
    expect(payoutFor(outside, noDue, DEFAULT_SETTINGS, market)).toEqual({
      inr: 8800,
      source: "outside_paypal",
      rateUsed: 88,
      rateDate: "2026-10-28",
    });
  });
});

describe("rateDateFor", () => {
  it("is the payment date for a paid invoice whose rupees are worked out", () => {
    expect(rateDateFor(paid)).toBe("2026-10-15");
    expect(rateDateFor({ ...paid, actualPayout: sandboxPayout })).toBe("2026-10-15");
  });

  it("is the payment date for a payment recorded outside PayPal, even with a stray figure", () => {
    const outside = { ...paid, paypalStatus: "MARKED_AS_PAID" };
    expect(rateDateFor(outside)).toBe("2026-10-15");
  });

  it("is none for an unpaid invoice, which keeps today's rate, or when PayPal reported rupees", () => {
    expect(rateDateFor(unpaid)).toBeNull();
    expect(rateDateFor({ ...paid, actualPayout: { ...sandboxPayout, netInr: 7874 } })).toBeNull();
  });
});

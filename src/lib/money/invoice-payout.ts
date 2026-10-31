import { convertToInr, estimatePayout, paypalRateFor } from "@/lib/money/payout";
import { isRecordedOutsidePayPal } from "@/lib/paypal/map";
import type { InvoiceSummary, MarketRates, Money, PayoutSource, Settings } from "@/types";

export interface InvoicePayout {
  inr: number;
  source: PayoutSource;
  // Rupees per unit used when the figure is worked out; null when PayPal reported the rupees.
  rateUsed: number | null;
  // Date of the ECB rate behind that figure.
  rateDate: string | null;
}

function isPaidOutsidePayPal(invoice: InvoiceSummary): boolean {
  return invoice.dueState === "paid" && isRecordedOutsidePayPal(invoice.paypalStatus);
}

// The date whose rate converts a payment: a paid invoice is converted at the rate of the day it was
// paid, an unpaid one at today's. PayPal's own rupees need no rate.
export function rateDateFor(invoice: InvoiceSummary): string | null {
  if (invoice.dueState !== "paid") return null;
  if (!isPaidOutsidePayPal(invoice) && (invoice.actualPayout?.netInr ?? null) !== null) return null;
  return invoice.paidOn;
}

// The one rule for the rupees of an invoice. `amountDue` is the part PayPal has not been paid yet,
// and `rates` are those of rateDateFor(invoice).
export function payoutFor(
  invoice: InvoiceSummary,
  amountDue: Money,
  settings: Settings,
  rates: MarketRates,
): InvoicePayout {
  const market = rates.rates[invoice.amount.currency];
  const rate = { value: market, onDate: rates.onDate, source: rates.source };

  if (invoice.dueState !== "paid") {
    const estimate = estimatePayout(amountDue, settings, rate);
    return {
      inr: estimate.netInr,
      source: "estimate",
      rateUsed: estimate.conversionRate,
      rateDate: rates.onDate,
    };
  }
  if (isPaidOutsidePayPal(invoice)) {
    return {
      inr: convertToInr(invoice.amount, market),
      source: "outside_paypal",
      rateUsed: market,
      rateDate: rates.onDate,
    };
  }

  const reported = invoice.actualPayout?.netInr ?? null;
  if (reported !== null) {
    return { inr: Math.round(reported), source: "paypal", rateUsed: null, rateDate: null };
  }
  const net = invoice.actualPayout?.net ?? estimatePayout(invoice.amount, settings, rate).net;
  const paypalRate = paypalRateFor(market, settings.fxMarkupPercent);
  return {
    inr: convertToInr(net, paypalRate),
    source: "estimate",
    rateUsed: paypalRate,
    rateDate: rates.onDate,
  };
}

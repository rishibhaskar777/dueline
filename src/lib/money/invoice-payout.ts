import { convertToInr, estimatePayout, paypalRateFor } from "@/lib/money/payout";
import type { InvoiceSummary, MarketRates, Money, Settings } from "@/types";

// Rupees expected in the bank for one invoice. `amountDue` is the part PayPal has not been paid yet.
export function payoutInrFor(
  invoice: InvoiceSummary,
  amountDue: Money,
  settings: Settings,
  market: MarketRates,
): number {
  const rate = {
    value: market.rates[invoice.amount.currency],
    onDate: market.onDate,
    source: market.source,
  };
  const actual = invoice.actualPayout;

  if (invoice.dueState !== "paid") return estimatePayout(amountDue, settings, rate).netInr;
  if (actual && actual.netInr !== null) return actual.netInr;
  if (actual) {
    return convertToInr(actual.net, paypalRateFor(rate.value, settings.fxMarkupPercent));
  }
  return estimatePayout(invoice.amount, settings, rate).netInr;
}

import { formatRate } from "@/lib/money/format";
import type {
  CurrencyCode,
  InvoiceSummary,
  RateLine,
  RatesWidget,
  TriggeredRateAlert,
} from "@/types";

export function rateComparison(percent: number | null): string {
  if (percent === null) return "";
  if (percent === 0) return "same as its 30-day average";
  return `${Math.abs(percent).toFixed(1)}% ${percent > 0 ? "above" : "below"} its 30-day average`;
}

// The currency with the most rupees still to come, since that is the rate that matters most today.
export function mostOutstandingCurrency(invoices: InvoiceSummary[]): CurrencyCode {
  const totals = new Map<CurrencyCode, number>();
  for (const invoice of invoices) {
    if (invoice.dueState === "paid") continue;
    const currency = invoice.amount.currency;
    totals.set(currency, (totals.get(currency) ?? 0) + (invoice.payoutInr ?? 0));
  }
  let best: CurrencyCode = "USD";
  let most = 0;
  for (const [currency, total] of totals) {
    if (total > most) {
      best = currency;
      most = total;
    }
  }
  return best;
}

export interface FeaturedRate {
  text: string;
  alerts: TriggeredRateAlert[];
}

export function featuredRate(
  rates: RatesWidget,
  alerts: TriggeredRateAlert[],
  invoices: InvoiceSummary[],
): FeaturedRate | null {
  const wanted = mostOutstandingCurrency(invoices);
  const line: RateLine | undefined =
    rates.lines.find(({ currency }) => currency === wanted) ?? rates.lines[0];
  if (!line) return null;
  const comparison = rateComparison(line.percentVsAverage);
  return {
    text: `${line.currency} ₹${formatRate(line.rate)}${comparison && ` · ${comparison}`}`,
    alerts: alerts.filter(({ currency }) => currency === line.currency),
  };
}

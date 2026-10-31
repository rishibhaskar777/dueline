import type { CurrencyCode, RateLine, RatesWidget } from "@/types";
import type { EcbRates } from "./ecb";

// Percent of the average the latest rate is above (or below, when negative), to one decimal.
function percentAbove(rate: number, average: number): number {
  return Math.round((rate / average - 1) * 1000) / 10;
}

export function rateLines(series: EcbRates[], currencies: CurrencyCode[]): RatesWidget {
  const latest = [...series].sort((a, b) => b.onDate.localeCompare(a.onDate))[0];
  const lines: RateLine[] = currencies.map((currency) => {
    const rates = series.map(({ rates }) => rates[currency]);
    const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    return {
      currency,
      rate: latest.rates[currency],
      percentVsAverage: series.length > 1 ? percentAbove(latest.rates[currency], average) : null,
    };
  });
  return { onDate: latest.onDate, source: "ecb", hasAverage: series.length > 1, lines };
}

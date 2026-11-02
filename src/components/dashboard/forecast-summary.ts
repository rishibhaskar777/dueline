import { formatRupees } from "@/lib/money/format";
import type { Forecast, ForecastBucket } from "@/types";

// A window with no invoices and no rupees says so, instead of showing a zero and an empty bar.
export function isNothingDue({ expectedInr, bestCaseInr, invoices }: ForecastBucket): boolean {
  return expectedInr === 0 && bestCaseInr === 0 && invoices === 0;
}

// The buckets are windows one after the other, not running totals: the first is the next 30 days,
// the other two reach to day 90.
export function bestCaseLine(forecast: Forecast): string {
  const [soon, ...later] = forecast.buckets;
  const best = `Best case ${formatRupees(soon.bestCaseInr)}`;
  if (later.every(isNothingDue)) return `${best} · nothing due after 30 days`;
  const more = later.reduce((sum, bucket) => sum + bucket.bestCaseInr, 0);
  return `${best} · ${formatRupees(more)} more in 31 to 90 days`;
}

// How much of the best case is expected, as a fraction for the bar.
export function expectedShare({ expectedInr, bestCaseInr }: ForecastBucket): number {
  return bestCaseInr > 0 ? Math.min(1, expectedInr / bestCaseInr) : 0;
}

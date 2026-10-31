import { addDays, daysBetween } from "@/lib/date-math";
import type { Forecast, ForecastBucket, InvoiceSummary, RiskLevel } from "@/types";

interface ForecastInput {
  invoice: InvoiceSummary;
  // The client's mean days late over their late invoices.
  averageDaysLate: number;
}

const FORECAST_BASIS =
  "Weighted by each client's payment history. Best case assumes everyone pays on time.";

const WEIGHTS: Record<RiskLevel, number> = { reliable: 0.95, watch: 0.85, late_payer: 0.7 };
// Nothing is known about a client with no history, so they are weighed like one to watch.
const UNKNOWN_WEIGHT = WEIGHTS.watch;
const LONG_OVERDUE_DAYS = 30;
const LONG_OVERDUE_WEIGHT = 0.5;
const MIN_DAYS_AHEAD_WHEN_OVERDUE = 3;

const WINDOWS = [
  { label: "Next 30 days", from: 0, to: 30 },
  { label: "31 to 60 days", from: 31, to: 60 },
  { label: "61 to 90 days", from: 61, to: 90 },
];

function weightOf(invoice: InvoiceSummary): number {
  if (invoice.dueState === "overdue" && invoice.daysLate > LONG_OVERDUE_DAYS) {
    return LONG_OVERDUE_WEIGHT;
  }
  return invoice.riskLevel ? WEIGHTS[invoice.riskLevel] : UNKNOWN_WEIGHT;
}

function usualDelay({ invoice, averageDaysLate }: ForecastInput): number {
  return invoice.riskLevel === null || invoice.riskLevel === "reliable"
    ? 0
    : Math.round(averageDaysLate);
}

export function expectedDate(input: ForecastInput, today: string): string {
  const { invoice } = input;
  if (invoice.dueState !== "overdue") return addDays(invoice.dueOn, usualDelay(input));
  const remaining = Math.max(MIN_DAYS_AHEAD_WHEN_OVERDUE, usualDelay(input) - invoice.daysLate);
  return addDays(today, remaining);
}

function bucketIndex(date: string, today: string): number {
  const ahead = daysBetween(today, date);
  return WINDOWS.findIndex(({ from, to }) => ahead >= from && ahead <= to);
}

// An overdue invoice is best-case paid today; any other on its due date.
function bestCaseDate({ dueState, dueOn }: InvoiceSummary, today: string): string {
  return dueState === "overdue" ? today : dueOn;
}

export function buildForecast(inputs: ForecastInput[], today: string): Forecast {
  const buckets: ForecastBucket[] = WINDOWS.map(({ label }) => ({
    label,
    expectedInr: 0,
    bestCaseInr: 0,
    invoices: 0,
  }));

  for (const input of inputs) {
    const { invoice } = input;
    if (invoice.dueState === "paid" || invoice.payoutInr === null) continue;

    const expected = buckets[bucketIndex(expectedDate(input, today), today)];
    if (expected) {
      expected.expectedInr += Math.round(invoice.payoutInr * weightOf(invoice));
      expected.invoices += 1;
    }
    const bestCase = buckets[bucketIndex(bestCaseDate(invoice, today), today)];
    if (bestCase) bestCase.bestCaseInr += invoice.payoutInr;
  }
  return { buckets, basis: FORECAST_BASIS };
}

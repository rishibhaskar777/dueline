import { formatRate } from "@/lib/money/format";
import type { CurrencyCode, RateAlert, TriggeredRateAlert } from "@/types";

// An alert is triggered while the rate is beyond its threshold, strictly: a rate exactly at the
// threshold is not.
export function evaluateRateAlerts(
  alerts: readonly RateAlert[],
  rates: Record<CurrencyCode, number>,
): TriggeredRateAlert[] {
  return alerts.flatMap((alert) => {
    const rate = rates[alert.currency];
    const hit = alert.direction === "above" ? rate > alert.threshold : rate < alert.threshold;
    return hit ? [{ ...alert, rate }] : [];
  });
}

export function describeAlert({ currency, direction, threshold }: RateAlert): string {
  return `${currency} ${direction} ₹${threshold}`;
}

export function describeTriggered(alert: TriggeredRateAlert): string {
  return `${describeAlert(alert)}: now ₹${formatRate(alert.rate, 2)}`;
}

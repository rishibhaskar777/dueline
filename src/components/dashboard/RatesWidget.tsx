import { formatDate } from "@/lib/format-date";
import { describeAlert } from "@/lib/automation/rate-alerts";
import { rateSourceLabel } from "@/components/shared/rate-source";
import { useOffline } from "@/components/shared/use-offline";
import { formatRate } from "@/lib/money/format";
import type { RatesWidget as Rates, TriggeredRateAlert } from "@/types";
import { DashboardWidget } from "./DashboardWidget";
import type { DashboardState } from "./use-dashboard";

function comparison(percent: number | null): string {
  if (percent === null) return "";
  if (percent === 0) return "same as its 30-day average";
  return `${Math.abs(percent).toFixed(1)}% ${percent > 0 ? "above" : "below"} its 30-day average`;
}

function Lines({ rates, alerts }: { rates: Rates; alerts: TriggeredRateAlert[] }) {
  const offline = useOffline();
  return (
    <>
      <ul className="grid gap-1">
        {rates.lines.map(({ currency, rate, percentVsAverage }) => (
          <li key={currency} className="text-sm tabular-nums">
            <span className="font-medium">{currency}</span> ₹{formatRate(rate, 2)}
            {percentVsAverage !== null && (
              <span className="text-muted-foreground">, {comparison(percentVsAverage)}</span>
            )}
            {alerts
              .filter((alert) => alert.currency === currency)
              .map((alert) => (
                <span
                  key={`${alert.direction}-${alert.threshold}`}
                  className="ml-2 rounded-md border border-due-soon px-1.5 py-0.5 text-xs font-medium text-due-soon"
                >
                  Alert: {describeAlert(alert)}
                </span>
              ))}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        {rateSourceLabel(rates.source, offline)} of {formatDate(rates.onDate)}.
        {!rates.hasAverage &&
          " The 30-day average is not available, so only today's rates are shown."}
      </p>
    </>
  );
}

export function RatesWidget({ state, onRetry }: { state: DashboardState; onRetry: () => void }) {
  return (
    <DashboardWidget
      id="rates"
      title="Rupee rates"
      state={state}
      onRetry={onRetry}
      emptyText="No exchange rates are available right now."
      isEmpty={({ rates }) => rates.lines.length === 0}
    >
      {({ rates, rateAlerts }) => <Lines rates={rates} alerts={rateAlerts} />}
    </DashboardWidget>
  );
}

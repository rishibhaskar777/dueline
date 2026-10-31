import { formatDate } from "@/lib/format-date";
import type { RatesWidget as Rates } from "@/types";
import { DashboardWidget } from "./DashboardWidget";
import type { DashboardState } from "./use-dashboard";

function comparison(percent: number | null): string {
  if (percent === null) return "";
  if (percent === 0) return "same as its 30-day average";
  return `${Math.abs(percent).toFixed(1)}% ${percent > 0 ? "above" : "below"} its 30-day average`;
}

function Lines({ rates }: { rates: Rates }) {
  return (
    <>
      <ul className="grid gap-1">
        {rates.lines.map(({ currency, rate, percentVsAverage }) => (
          <li key={currency} className="text-sm tabular-nums">
            <span className="font-medium">{currency}</span> ₹{rate.toFixed(2)}
            {percentVsAverage !== null && (
              <span className="text-muted-foreground">, {comparison(percentVsAverage)}</span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        {rates.source === "manual" ? "Rates you set by hand" : "European Central Bank rates"} of{" "}
        {formatDate(rates.onDate)}.
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
      {({ rates }) => <Lines rates={rates} />}
    </DashboardWidget>
  );
}

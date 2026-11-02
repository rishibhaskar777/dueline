import { formatRupees } from "@/lib/money/format";
import { formatDays } from "@/lib/format-days";
import type { Forecast, PaySpeed } from "@/types";
import { DashboardWidget } from "./DashboardWidget";
import { bestCaseLine, expectedShare } from "./forecast-summary";
import type { DashboardState } from "./use-dashboard";

function Tile({ figure, caption }: { figure: string; caption: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-inner px-3.5 py-3">
      <p className="font-heading text-2xl font-extrabold tabular-nums">{figure}</p>
      <p className="text-[13px] text-muted-foreground">{caption}</p>
    </div>
  );
}

function Summary({ forecast, paySpeed }: { forecast: Forecast; paySpeed: PaySpeed | null }) {
  const [soon] = forecast.buckets;

  return (
    <div className="grid gap-3">
      <p className="text-[15px] text-muted-foreground">
        Next 30 days, weighted by each client&apos;s history
      </p>
      <p className="font-heading text-[38px] leading-tight font-extrabold tracking-[-0.8px] tabular-nums">
        {formatRupees(soon.expectedInr)}
      </p>
      <div aria-hidden="true" className="h-2.5 rounded-full bg-tint-blue">
        <div
          className="dl-bar h-2.5 rounded-full bg-blue-line"
          style={{ width: `${expectedShare(soon) * 100}%` }}
        />
      </div>
      <p className="text-sm text-subtle tabular-nums">{bestCaseLine(forecast)}</p>
      {paySpeed && (
        <div className="flex gap-2.5 pt-1.5">
          <Tile figure={formatDays(paySpeed.averageDays)} caption="to get paid, on average" />
          <Tile figure={`${paySpeed.onTimePercent}%`} caption="paid on time" />
        </div>
      )}
      <p className="text-xs text-subtle">
        {forecast.basis}
        {paySpeed &&
          ` Averages are over ${paySpeed.invoices} ${paySpeed.invoices === 1 ? "invoice" : "invoices"} paid in the last 12 months.`}
      </p>
    </div>
  );
}

export function ForecastWidget({ state, onRetry }: { state: DashboardState; onRetry: () => void }) {
  return (
    <DashboardWidget
      id="forecast"
      title="What will arrive next"
      state={state}
      onRetry={onRetry}
      emptyText="Nothing is waiting to be paid, so there is nothing to forecast."
      isEmpty={({ forecast }) =>
        forecast.buckets.every(({ bestCaseInr, invoices }) => bestCaseInr === 0 && invoices === 0)
      }
    >
      {({ forecast, paySpeed }) => <Summary forecast={forecast} paySpeed={paySpeed} />}
    </DashboardWidget>
  );
}

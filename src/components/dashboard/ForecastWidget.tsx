import { formatRupees } from "@/lib/money/format";
import type { Forecast } from "@/types";
import { DashboardWidget } from "./DashboardWidget";
import type { DashboardState } from "./use-dashboard";

function invoiceCount(count: number): string {
  return `${count} ${count === 1 ? "invoice" : "invoices"}`;
}

function Buckets({ forecast }: { forecast: Forecast }) {
  const largest = Math.max(1, ...forecast.buckets.map(({ bestCaseInr }) => bestCaseInr));

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-3">
        {forecast.buckets.map((bucket) => (
          <li key={bucket.label}>
            <p className="text-sm text-muted-foreground">{bucket.label}</p>
            <p className="mt-1 font-heading text-2xl font-semibold text-navy tabular-nums">
              {formatRupees(bucket.expectedInr)}
            </p>
            <div aria-hidden="true" className="relative mt-2 h-2 rounded-full bg-ground">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-blue/25"
                style={{ width: `${(bucket.bestCaseInr / largest) * 100}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-blue"
                style={{ width: `${(bucket.expectedInr / largest) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground tabular-nums">
              Best case {formatRupees(bucket.bestCaseInr)} · {invoiceCount(bucket.invoices)}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">{forecast.basis}</p>
    </>
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
      {({ forecast }) => <Buckets forecast={forecast} />}
    </DashboardWidget>
  );
}

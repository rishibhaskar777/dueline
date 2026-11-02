"use client";

import { useState } from "react";
import { describeAlert } from "@/lib/automation/rate-alerts";
import { formatRupees } from "@/lib/money/format";
import type { DashboardResponse, FeesLost, InvoiceSummary } from "@/types";
import { DashboardWidget } from "./DashboardWidget";
import { featuredRate } from "./rate-line";
import type { DashboardState } from "./use-dashboard";

function Figures({ data, invoices }: { data: DashboardResponse; invoices: InvoiceSummary[] }) {
  const fees: FeesLost = data.feesLost;
  const [explained, setExplained] = useState(false);
  const rate = featuredRate(data.rates, data.rateAlerts, invoices);

  return (
    <div className="grid gap-2.5">
      <p className="font-heading text-[40px] leading-tight font-extrabold tracking-[-0.8px] tabular-nums">
        {formatRupees(fees.lostInr)}
      </p>
      <p className="text-[15px] leading-normal text-muted-foreground">
        lost to PayPal in {fees.financialYear} so far: {formatRupees(fees.feesInr)} in fees and{" "}
        {formatRupees(fees.conversionLossInr)} in the conversion rate. ₹{fees.lostPer100.toFixed(1)}{" "}
        of every ₹100.
      </p>
      {rate && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-subtle tabular-nums">
          {rate.text}
          {rate.alerts.map((alert) => (
            <span
              key={`${alert.direction}-${alert.threshold}`}
              className="rounded-full bg-tint-amber px-2.5 py-0.5 text-xs font-bold text-due-soon"
            >
              Alert: {describeAlert(alert)}
            </span>
          ))}
        </p>
      )}
      <div>
        <button
          type="button"
          aria-expanded={explained}
          onClick={() => setExplained((value) => !value)}
          className="rounded-md text-sm font-semibold text-link underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-11"
        >
          How this is worked out
        </button>
        {explained && (
          <p className="mt-1 text-xs text-muted-foreground">
            Counts payments made through PayPal, with PayPal&apos;s own fee and rupee figures where
            it reported them and an estimate at the day&apos;s ECB rate otherwise. Payments recorded
            outside PayPal pay no PayPal fee.
          </p>
        )}
      </div>
    </div>
  );
}

export function FeesLostWidget({
  state,
  onRetry,
  invoices,
}: {
  state: DashboardState;
  onRetry: () => void;
  invoices: InvoiceSummary[];
}) {
  return (
    <DashboardWidget
      id="fees-lost"
      title="What getting paid costs"
      state={state}
      onRetry={onRetry}
      emptyText="No payment has come through PayPal this financial year yet."
      isEmpty={({ feesLost }) => feesLost.receivedInr === 0 && feesLost.lostInr === 0}
    >
      {(data) => <Figures data={data} invoices={invoices} />}
    </DashboardWidget>
  );
}

import { formatRupees } from "@/lib/money/format";
import type { FeesLost } from "@/types";
import { DashboardWidget } from "./DashboardWidget";
import type { DashboardState } from "./use-dashboard";

function Figures({ fees }: { fees: FeesLost }) {
  return (
    <>
      <p className="font-heading text-4xl font-semibold text-navy tabular-nums">
        {formatRupees(fees.lostInr)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        lost to PayPal in {fees.financialYear} so far: {formatRupees(fees.feesInr)} in fees and{" "}
        {formatRupees(fees.conversionLossInr)} in the conversion rate
      </p>
      <p className="mt-3 text-sm tabular-nums">
        <span className="font-medium text-late">₹{fees.lostPer100.toFixed(1)}</span> lost per ₹100
        received
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Counts payments made through PayPal, with PayPal&apos;s own fee and rupee figures where it
        reported them and an estimate at the day&apos;s ECB rate otherwise. Payments recorded
        outside PayPal pay no PayPal fee.
      </p>
    </>
  );
}

export function FeesLostWidget({ state, onRetry }: { state: DashboardState; onRetry: () => void }) {
  return (
    <DashboardWidget
      id="fees-lost"
      title="What getting paid costs"
      state={state}
      onRetry={onRetry}
      emptyText="No payment has come through PayPal this financial year yet."
      isEmpty={({ feesLost }) => feesLost.receivedInr === 0 && feesLost.lostInr === 0}
    >
      {({ feesLost }) => <Figures fees={feesLost} />}
    </DashboardWidget>
  );
}

import { StatTile } from "@/components/shared/StatTile";
import { formatRupees } from "@/lib/money/format";
import type { Totals } from "@/types";

function PaidNote({ totals }: { totals: Totals }) {
  return (
    <>
      {formatRupees(totals.paidLast30PayPalInr)} through PayPal
      {totals.paidLast30OutsideInr > 0 && (
        <span className="mt-1 block text-xs">
          and {formatRupees(totals.paidLast30OutsideInr)} recorded outside PayPal
        </span>
      )}
    </>
  );
}

export function TotalsStrip({ totals }: { totals: Totals }) {
  const overdueNote = totals.overdueCount === 1 ? "1 invoice" : `${totals.overdueCount} invoices`;

  return (
    <dl aria-label="Totals" className="grid gap-4 sm:grid-cols-3">
      <StatTile
        label="Outstanding"
        value={formatRupees(totals.outstandingInr)}
        note="Estimated after fees"
      />
      <StatTile
        label="Overdue"
        value={formatRupees(totals.overdueInr)}
        note={overdueNote}
        tone="late"
      />
      <StatTile
        label="Paid in the last 30 days"
        value={formatRupees(totals.paidLast30Inr)}
        note={<PaidNote totals={totals} />}
      />
    </dl>
  );
}

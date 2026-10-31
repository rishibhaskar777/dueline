import { StatTile } from "@/components/shared/StatTile";
import { formatRupees } from "@/lib/money/format";
import type { Totals } from "@/types";

function PaidNote({ outsideInr }: { outsideInr: number }) {
  return (
    <>
      Rupees from paid invoices
      {outsideInr > 0 && (
        <span className="mt-1 block text-xs">
          plus {formatRupees(outsideInr)} recorded outside PayPal
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
        label="Paid this month"
        value={formatRupees(totals.paidThisMonthPayPalInr)}
        note={<PaidNote outsideInr={totals.paidThisMonthOutsideInr} />}
      />
    </dl>
  );
}

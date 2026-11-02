import Link from "next/link";
import { formatRupees } from "@/lib/money/format";
import { TotalCard } from "@/components/shared/TotalCard";
import type { InvoiceSummary, Totals } from "@/types";
import { invoiceCount, openInvoiceCount, paidNote } from "./totals-notes";

export function TotalsStrip({ totals, invoices }: { totals: Totals; invoices: InvoiceSummary[] }) {
  return (
    <dl aria-label="Totals" className="grid gap-4 lg:grid-cols-3">
      <TotalCard
        label="Outstanding"
        value={formatRupees(totals.outstandingInr)}
        note={`${invoiceCount(openInvoiceCount(invoices))} · estimated after fees`}
      />
      <TotalCard
        label="Overdue"
        value={formatRupees(totals.overdueInr)}
        tone="late"
        note={
          totals.overdueCount > 0 ? (
            <>
              {invoiceCount(totals.overdueCount)} ·{" "}
              <Link href="/nudges" className="text-link underline">
                see reminders
              </Link>
            </>
          ) : (
            "Nothing overdue"
          )
        }
      />
      <TotalCard
        label="Paid in the last 30 days"
        value={formatRupees(totals.paidLast30Inr)}
        tone="navy"
        note={paidNote(totals)}
      />
    </dl>
  );
}

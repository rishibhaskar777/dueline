import Link from "next/link";
import type { ReactNode } from "react";
import { formatRupees } from "@/lib/money/format";
import { cn } from "@/lib/utils";
import type { InvoiceSummary, Totals } from "@/types";
import { invoiceCount, openInvoiceCount, paidNote } from "./totals-notes";

interface TotalCardProps {
  label: string;
  value: string;
  note: ReactNode;
  tone?: "late" | "navy";
}

function TotalCard({ label, value, note, tone }: TotalCardProps) {
  const navy = tone === "navy";
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-[24px] p-[26px] transition-transform duration-[350ms] ease-spring hover:-translate-y-[3px] motion-reduce:transition-none motion-reduce:hover:transform-none",
        navy ? "bg-navy-card text-white" : "surface",
      )}
    >
      <dt
        className={cn(
          "text-base font-semibold",
          navy ? "text-navy-card-muted" : "text-muted-foreground",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "font-heading text-[46px] leading-[1.15] font-extrabold tracking-[-1px] tabular-nums",
          tone === "late" && "text-late",
        )}
      >
        {value}
      </dd>
      <dd className={cn("text-[15px]", navy ? "text-navy-card-muted" : "text-subtle")}>{note}</dd>
    </div>
  );
}

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

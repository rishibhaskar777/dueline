import Link from "next/link";
import { StatusBadge } from "@/components/receivables/StatusBadge";
import { formatDate } from "@/lib/format-date";
import { formatMoney } from "@/lib/money/format";
import type { InvoiceSummary } from "@/types";

export function InvoiceList({ invoices, today }: { invoices: InvoiceSummary[]; today: string }) {
  return (
    <section
      aria-labelledby="client-invoices-title"
      className="surface p-6 [--h2-size:24px] [--surface-radius:24px]"
    >
      <h2 id="client-invoices-title">Invoices</h2>
      <ul className="mt-2 divide-y divide-line">
        {invoices.map((invoice) => (
          <li
            key={invoice.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4"
          >
            <div className="min-w-0">
              <Link
                href={`/invoices/${encodeURIComponent(invoice.id)}`}
                className="font-heading text-[17px] font-bold text-link underline underline-offset-[3px]"
              >
                {invoice.number}
              </Link>
              <p className="text-sm text-muted-foreground">
                {invoice.work} · issued {formatDate(invoice.issuedOn)} · due{" "}
                {formatDate(invoice.dueOn)}
              </p>
            </div>
            <div className="flex items-center gap-3.5">
              <span className="font-semibold tabular-nums">{formatMoney(invoice.amount)}</span>
              <StatusBadge invoice={invoice} today={today} lateness />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

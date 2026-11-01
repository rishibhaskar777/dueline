import Link from "next/link";
import { StatusBadge } from "@/components/receivables/StatusBadge";
import { formatDate } from "@/lib/format-date";
import { formatMoney } from "@/lib/money/format";
import type { InvoiceSummary } from "@/types";

export function InvoiceList({ invoices, today }: { invoices: InvoiceSummary[]; today: string }) {
  return (
    <section
      aria-labelledby="client-invoices-title"
      className="rounded-xl border border-line bg-card p-6"
    >
      <h2 id="client-invoices-title" className="text-xl font-semibold">
        Invoices
      </h2>
      <ul className="mt-3 divide-y divide-line">
        {invoices.map((invoice) => (
          <li
            key={invoice.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3"
          >
            <div>
              <Link
                href={`/invoices/${encodeURIComponent(invoice.id)}`}
                className="font-medium text-blue underline-offset-2 hover:underline"
              >
                {invoice.number}
              </Link>
              <p className="text-sm text-muted-foreground">
                {invoice.work} · issued {formatDate(invoice.issuedOn)} · due{" "}
                {formatDate(invoice.dueOn)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="tabular-nums">{formatMoney(invoice.amount)}</span>
              <StatusBadge invoice={invoice} today={today} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

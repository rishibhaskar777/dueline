import Link from "next/link";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { formatDate } from "@/lib/format-date";
import { formatMoney, formatRupees } from "@/lib/money/format";
import type { InvoiceSummary } from "@/types";
import { StatusBadge } from "./StatusBadge";

interface InvoiceCardsProps {
  invoices: InvoiceSummary[];
  today: string;
  onOpen: (invoice: InvoiceSummary) => void;
}

// The invoice table as a list, for a narrow screen: the key facts of each invoice on one card.
export function InvoiceCards({ invoices, today, onOpen }: InvoiceCardsProps) {
  if (invoices.length === 0) {
    return <p className="px-6 pb-6 text-sm text-muted-foreground">No invoices match.</p>;
  }
  return (
    <ul className="grid gap-3 px-4 pb-4">
      {invoices.map((invoice) => (
        <li key={invoice.id} className="rounded-lg border border-line p-3">
          <button
            type="button"
            onClick={() => onOpen(invoice)}
            className="grid min-h-11 w-full gap-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-medium">{invoice.client.name}</span>
              <StatusBadge invoice={invoice} today={today} />
            </span>
            <span className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>
                {invoice.number} · due {formatDate(invoice.dueOn)}
              </span>
              {invoice.riskLevel && invoice.riskLevel !== "reliable" && (
                <RiskBadge level={invoice.riskLevel} />
              )}
            </span>
            <span className="flex items-baseline justify-between gap-2 tabular-nums">
              <span className="font-medium">{formatMoney(invoice.amount)}</span>
              {invoice.payoutInr !== null && (
                <span className="text-sm text-muted-foreground">
                  {formatRupees(invoice.payoutInr)} to your bank
                </span>
              )}
            </span>
          </button>
          <Link
            href={`/invoices/${encodeURIComponent(invoice.id)}`}
            className="mt-1 flex min-h-11 items-center text-sm text-blue underline underline-offset-2"
          >
            Open invoice page
          </Link>
        </li>
      ))}
    </ul>
  );
}

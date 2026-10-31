import Link from "next/link";
import { formatDate } from "@/lib/format-date";
import { formatMoney, formatRupees } from "@/lib/money/format";
import type { UpcomingDue } from "@/types";
import { DashboardWidget } from "./DashboardWidget";
import type { DashboardState } from "./use-dashboard";

function List({ invoices }: { invoices: UpcomingDue[] }) {
  return (
    <ul className="divide-y divide-line">
      {invoices.map((invoice) => (
        <li key={invoice.invoiceId} className="flex flex-wrap justify-between gap-x-4 py-2">
          <div>
            <Link
              href={`/invoices/${encodeURIComponent(invoice.invoiceId)}`}
              className="text-sm font-medium text-blue underline-offset-2 hover:underline"
            >
              {invoice.clientName}
            </Link>
            <p className="text-xs text-muted-foreground">
              {invoice.invoiceNumber} · due {formatDate(invoice.dueOn)}
            </p>
          </div>
          <p className="text-right text-sm tabular-nums">
            {formatMoney(invoice.amount)}
            {invoice.payoutInr !== null && (
              <span className="block text-xs text-muted-foreground">
                about {formatRupees(invoice.payoutInr)}
              </span>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function UpcomingDueWidget({
  state,
  onRetry,
}: {
  state: DashboardState;
  onRetry: () => void;
}) {
  return (
    <DashboardWidget
      id="upcoming-due"
      title="Due in the next 14 days"
      state={state}
      onRetry={onRetry}
      emptyText="No invoice falls due in the next 14 days."
      isEmpty={({ upcomingDue }) => upcomingDue.length === 0}
    >
      {({ upcomingDue }) => <List invoices={upcomingDue} />}
    </DashboardWidget>
  );
}

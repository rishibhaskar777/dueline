import Link from "next/link";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { formatDate } from "@/lib/format-date";
import { formatRupees } from "@/lib/money/format";
import type { ClientSummary } from "@/types";
import { clientHref } from "./client-href";

// The clients table as a list, for a narrow screen.
export function ClientCards({ clients }: { clients: ClientSummary[] }) {
  if (clients.length === 0) {
    return <p className="px-6 pb-6 text-sm text-muted-foreground">No clients match.</p>;
  }
  return (
    <ul className="grid gap-3 px-4 pb-4">
      {clients.map((client) => (
        <li key={client.key} className="rounded-lg border border-line p-3">
          <Link
            href={clientHref(client.key)}
            className="grid min-h-11 gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-medium text-blue">{client.name}</span>
              {client.riskLevel && <RiskBadge level={client.riskLevel} />}
            </span>
            <span className="flex justify-between gap-2 text-sm tabular-nums">
              <span>{formatRupees(client.outstandingInr)} outstanding</span>
              <span className="text-muted-foreground">{formatRupees(client.billedInr)} billed</span>
            </span>
            <span className="text-sm text-muted-foreground">
              {client.invoices} {client.invoices === 1 ? "invoice" : "invoices"}
              {client.lastPaidOn && ` · last paid ${formatDate(client.lastPaidOn)}`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

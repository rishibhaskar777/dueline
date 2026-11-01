"use client";

import { RiskBadge } from "@/components/shared/RiskBadge";
import { RiskReason } from "@/components/shared/RiskReason";
import { useClientRisk } from "@/components/shared/use-client-risk";
import { formatDate } from "@/lib/format-date";
import { formatRupees } from "@/lib/money/format";
import type { InvoiceSummary } from "@/types";
import { rateNote } from "./invoice-status";

function lateText(daysLate: number): string {
  if (daysLate === 0) return "Not late";
  return `${daysLate} ${daysLate === 1 ? "day" : "days"}`;
}

export function Dates({ invoice }: { invoice: InvoiceSummary }) {
  return (
    <dl className="grid grid-cols-3 gap-3 text-sm">
      <div>
        <dt className="text-muted-foreground">Issued</dt>
        <dd className="tabular-nums">{formatDate(invoice.issuedOn)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Due</dt>
        <dd className="tabular-nums">{formatDate(invoice.dueOn)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{invoice.paidOn ? "Paid" : "Late by"}</dt>
        <dd className="tabular-nums">
          {invoice.paidOn ? formatDate(invoice.paidOn) : lateText(invoice.daysLate)}
        </dd>
      </div>
    </dl>
  );
}

export function Work({ invoice }: { invoice: InvoiceSummary }) {
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">Work </span>
      {invoice.work}
    </p>
  );
}

export function OutsidePayPal({ invoice }: { invoice: InvoiceSummary }) {
  return (
    <div>
      <p>
        About{" "}
        <span className="font-heading text-3xl font-semibold text-foreground tabular-nums">
          {invoice.payoutInr === null ? "–" : formatRupees(invoice.payoutInr)}
        </span>{" "}
        recorded
      </p>
      <p className="text-sm text-muted-foreground">
        Paid outside PayPal, so no PayPal fee or markup was taken. Converted at the{" "}
        {rateNote(invoice) ?? "ECB rate"}.
      </p>
    </div>
  );
}

export function ClientHistory({ client }: { client: InvoiceSummary["client"] }) {
  const risk = useClientRisk(client.email, client.name);
  if (!risk || risk.invoicesConsidered === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm">
      <RiskBadge level={risk.level} />
      <span>
        <RiskReason risk={risk} />
      </span>
    </p>
  );
}

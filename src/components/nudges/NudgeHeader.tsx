"use client";

import { RiskBadge } from "@/components/shared/RiskBadge";
import { RiskReason } from "@/components/shared/RiskReason";
import { useClientRisk } from "@/components/shared/use-client-risk";
import { formatDate } from "@/lib/format-date";
import { formatDays } from "@/lib/format-days";
import { formatMoney } from "@/lib/money/format";
import type { InvoiceSummary, PaySpeed, ReminderDraft } from "@/types";
import { daysLateLabel, historyLabel } from "./nudge-model";

interface NudgeHeaderProps {
  invoice: InvoiceSummary;
  paySpeed: PaySpeed | null;
  history: ReminderDraft["history"];
}

export function NudgeHeader({ invoice, paySpeed, history }: NudgeHeaderProps) {
  const risk = useClientRisk(invoice.client.email, invoice.client.name);

  return (
    <header>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-xl font-semibold">{invoice.client.name}</h2>
        {risk && risk.invoicesConsidered > 0 && <RiskBadge level={risk.level} />}
      </div>
      {risk && risk.invoicesConsidered > 0 && (
        <p className="mt-1 text-sm">
          <RiskReason risk={risk} />
        </p>
      )}
      <p className="mt-2 flex flex-wrap items-baseline gap-x-3 text-sm text-muted-foreground">
        <span>Invoice {invoice.number}</span>
        <span className="font-medium text-foreground tabular-nums">
          {formatMoney(invoice.amount)}
        </span>
        <span className="tabular-nums">Due {formatDate(invoice.dueOn)}</span>
        <span className="font-medium text-late tabular-nums">
          {daysLateLabel(invoice.daysLate)}
        </span>
      </p>
      {paySpeed && (
        <p className="mt-1 text-sm text-muted-foreground">
          Average days to get paid: {formatDays(paySpeed.averageDays)}, {paySpeed.onTimePercent}% on
          time
        </p>
      )}
      {history.length > 0 && (
        <ul className="mt-2 text-sm text-muted-foreground">
          {history.map((entry) => (
            <li key={entry.sentAt}>{historyLabel(entry)}</li>
          ))}
        </ul>
      )}
    </header>
  );
}

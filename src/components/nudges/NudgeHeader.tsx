"use client";

import { RiskBadge } from "@/components/shared/RiskBadge";
import { useClientRisk } from "@/components/shared/use-client-risk";
import { formatDate } from "@/lib/format-date";
import { formatMoney } from "@/lib/money/format";
import type { InvoiceSummary, ReminderDraft } from "@/types";
import { daysLateLabel, historyLabel } from "./nudge-model";

interface NudgeHeaderProps {
  invoice: InvoiceSummary;
  history: ReminderDraft["history"];
}

export function NudgeHeader({ invoice, history }: NudgeHeaderProps) {
  const risk = useClientRisk(invoice.client.email, invoice.client.name);
  const judged = risk && risk.invoicesConsidered > 0 ? risk : null;

  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h2 className="font-heading text-[28px] font-extrabold tracking-[-0.5px] break-words">
            {invoice.client.name}
          </h2>
          {judged && <RiskBadge level={judged.level} />}
        </div>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Invoice {invoice.number} · due {formatDate(invoice.dueOn)}
          {judged && ` · late on ${judged.lateCount} of ${judged.invoicesConsidered} invoices`}
        </p>
        {history.length > 0 && (
          <ul className="mt-1.5 text-sm text-muted-foreground">
            {history.map((entry) => (
              <li key={entry.sentAt}>{historyLabel(entry)}</li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-right">
        <span className="block font-heading text-[30px] font-extrabold tabular-nums">
          {formatMoney(invoice.amount)}
        </span>
        <span className="text-[15px] font-semibold text-late tabular-nums">
          {daysLateLabel(invoice.daysLate)}
        </span>
      </p>
    </header>
  );
}

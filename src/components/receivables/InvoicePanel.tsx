"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format-date";
import { formatMoney, formatRupees } from "@/lib/money/format";
import { cn } from "@/lib/utils";
import type { InvoiceSummary } from "@/types";
import { EstimateComparison } from "./EstimateComparison";
import { StatusBadge } from "./StatusBadge";

interface InvoicePanelProps {
  invoice: InvoiceSummary | null;
  today: string;
  onClose: () => void;
}

function lateText(daysLate: number): string {
  if (daysLate === 0) return "Not late";
  return `${daysLate} ${daysLate === 1 ? "day" : "days"}`;
}

function Dates({ invoice }: { invoice: InvoiceSummary }) {
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

function Body({ invoice }: { invoice: InvoiceSummary }) {
  const unpaid = invoice.dueState !== "paid";

  return (
    <div className="grid gap-5">
      <Dates invoice={invoice} />
      {unpaid && invoice.payoutInr !== null && (
        <div>
          <p>
            About{" "}
            <span className="font-heading text-3xl font-semibold text-navy tabular-nums">
              {formatRupees(invoice.payoutInr)}
            </span>{" "}
            reaches your bank
          </p>
          <p className="text-sm text-muted-foreground">Estimate from published fees and rates</p>
        </div>
      )}
      {unpaid ? (
        <a
          href={invoice.payLink}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
        >
          Open payer link
        </a>
      ) : (
        <EstimateComparison invoice={invoice} />
      )}
      {invoice.purposeCode && (
        <p className="text-sm">
          Purpose code <span className="font-medium">{invoice.purposeCode}</span>
          <span className="text-muted-foreground"> · Suggestion, confirm with your CA</span>
        </p>
      )}
    </div>
  );
}

export function InvoicePanel({ invoice, today, onClose }: InvoicePanelProps) {
  return (
    <Dialog open={invoice !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        {invoice && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">{invoice.client.name}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <span>Invoice {invoice.number}</span>
                <StatusBadge invoice={invoice} today={today} />
                <span className="font-medium text-foreground tabular-nums">
                  {formatMoney(invoice.amount)}
                </span>
              </DialogDescription>
            </DialogHeader>
            <Body key={invoice.id} invoice={invoice} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

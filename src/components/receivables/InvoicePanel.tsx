"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney, formatRupees } from "@/lib/money/format";
import { cn } from "@/lib/utils";
import type { InvoiceSummary } from "@/types";
import { EstimateComparison } from "./EstimateComparison";
import { ClientHistory, Dates, OutsidePayPal, Work } from "./InvoiceFacts";
import { isPaidOutsidePayPal, rateNote } from "./invoice-status";
import { StatusBadge } from "./StatusBadge";

interface InvoicePanelProps {
  invoice: InvoiceSummary | null;
  today: string;
  onClose: () => void;
}

function Body({ invoice }: { invoice: InvoiceSummary }) {
  const unpaid = invoice.dueState !== "paid";

  return (
    <div className="grid gap-5">
      <ClientHistory client={invoice.client} />
      <Work invoice={invoice} />
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
          <p className="text-sm text-muted-foreground">
            Estimate from published fees and rates
            {rateNote(invoice) && ` · ${rateNote(invoice)}`}
          </p>
        </div>
      )}
      {isPaidOutsidePayPal(invoice) && <OutsidePayPal invoice={invoice} />}
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
        !isPaidOutsidePayPal(invoice) && <EstimateComparison invoice={invoice} />
      )}
      <Link
        href={`/invoices/${encodeURIComponent(invoice.id)}`}
        className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
      >
        Open invoice page
      </Link>
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

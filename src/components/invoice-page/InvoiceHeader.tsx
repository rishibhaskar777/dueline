"use client";

import { clientHref } from "@/components/clients/client-href";
import Link from "next/link";
import { CopyLinkButton } from "@/components/invoice-page/CopyLinkButton";
import { rateNote } from "@/components/receivables/invoice-status";
import { StatusBadge } from "@/components/receivables/StatusBadge";
import { SourceTag } from "@/components/shared/SourceTag";
import { buttonVariants } from "@/components/ui/button";
import { formatMoney, formatRupees } from "@/lib/money/format";
import { cn } from "@/lib/utils";
import type { InvoiceDetailResponse } from "@/types";

interface InvoiceHeaderProps {
  invoice: InvoiceDetailResponse["invoice"];
  clientKey: string;
  today: string;
}

export function InvoiceHeader({ invoice, clientKey, today }: InvoiceHeaderProps) {
  const cancelled = invoice.paypalStatus === "CANCELLED";

  return (
    <header className="grid gap-4">
      <div>
        <p className="text-sm">
          <Link href="/receivables" className="text-blue underline underline-offset-2">
            Receivables
          </Link>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">Invoice {invoice.number}</h1>
          {cancelled ? (
            <span className="rounded-md bg-ground px-2 py-0.5 text-sm font-medium">Cancelled</span>
          ) : (
            <StatusBadge invoice={invoice} today={today} />
          )}
        </div>
        <p className="mt-2">
          <Link
            href={clientHref(clientKey)}
            className="text-lg font-medium text-blue underline-offset-2 hover:underline"
          >
            {invoice.client.name}
          </Link>
        </p>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <p className="font-heading text-4xl font-semibold text-navy tabular-nums">
          {formatMoney(invoice.amount)}
        </p>
        {invoice.payoutInr !== null && !cancelled && (
          <p className="tabular-nums">
            <span className="text-xl font-semibold">{formatRupees(invoice.payoutInr)}</span>
            {invoice.payoutSource && <SourceTag source={invoice.payoutSource} />}
            {rateNote(invoice) && (
              <span className="ml-2 text-sm text-muted-foreground">{rateNote(invoice)}</span>
            )}
          </p>
        )}
      </div>
      {invoice.payLink && !cancelled && (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={invoice.payLink}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
          >
            Open PayPal payer link
          </a>
          <CopyLinkButton link={invoice.payLink} />
        </div>
      )}
    </header>
  );
}

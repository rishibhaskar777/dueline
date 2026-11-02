"use client";

import Link from "next/link";
import { clientHref } from "@/components/clients/client-href";
import { CopyLinkButton } from "@/components/invoice-page/CopyLinkButton";
import { StatusBadge } from "@/components/receivables/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InvoiceDetailResponse } from "@/types";
import { headerActions } from "./header-actions";

interface InvoiceHeaderProps extends Pick<InvoiceDetailResponse, "invoice" | "details"> {
  today: string;
}

const PILL = "h-11 px-5 font-bold";

export function InvoiceHeader({ invoice, details, today }: InvoiceHeaderProps) {
  const cancelled = invoice.paypalStatus === "CANCELLED";
  const actions = headerActions({ invoice, details });

  return (
    <header className="grid gap-5">
      <Link href="/receivables" className="w-fit text-[15px] font-semibold text-link underline">
        <span aria-hidden="true">← </span>Home
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-4xl font-extrabold tracking-[-1.2px] md:text-[44px]">
              Invoice {invoice.number}
            </h1>
            {cancelled ? (
              <Badge className="bg-chip font-bold text-muted-foreground">Cancelled</Badge>
            ) : (
              <StatusBadge invoice={invoice} today={today} detailed />
            )}
          </div>
          <Link
            href={clientHref(details.clientKey)}
            className="w-fit text-[17px] font-semibold text-link underline underline-offset-[3px]"
          >
            {invoice.client.name}
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 max-sm:w-full max-sm:[&>*]:flex-1">
          {actions.openPayerLink && (
            <a
              href={invoice.payLink}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline" }), PILL)}
            >
              Open payer link <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
          {actions.copyPayerLink && <CopyLinkButton link={invoice.payLink} className={PILL} />}
          {actions.sendReminder && (
            <Link
              href={`/nudges#invoice-${encodeURIComponent(invoice.id)}`}
              className={cn(buttonVariants(), PILL)}
            >
              Send a reminder
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

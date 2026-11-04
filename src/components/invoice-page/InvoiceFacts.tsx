"use client";

import { useCallback } from "react";
import Link from "next/link";
import { clientHref } from "@/components/clients/client-href";
import { findPurposeCode } from "@/lib/export/purpose-codes";
import { formatDate } from "@/lib/format-date";
import { formatDays } from "@/lib/format-days";
import { getClients } from "@/lib/api-client";
import { useLoad } from "@/components/shared/use-load";
import { promiseStatus } from "@/components/shared/promise-model";
import type { InvoiceDetailResponse } from "@/types";
import { clientLine, dueSentence, lutSentence } from "./invoice-facts";

interface InvoiceFactsProps extends Pick<InvoiceDetailResponse, "invoice" | "details"> {
  today: string;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[17px] font-semibold break-words">{children}</dd>
    </div>
  );
}

// The client's country is on the invoice's billing address; an invoice without one borrows the
// country from the client's other invoices.
function useClientCountry({
  invoice,
  details,
}: Pick<InvoiceDetailResponse, "invoice" | "details">) {
  const own = invoice.client.country ?? null;
  const load = useCallback(async () => {
    if (own) return own;
    const clients = await getClients();
    return clients.find(({ key }) => key === details.clientKey)?.country ?? null;
  }, [own, details.clientKey]);
  const { state } = useLoad(load);
  return state.kind === "ready" ? state.data : own;
}

export function InvoiceFacts({ invoice, details, today }: InvoiceFactsProps) {
  const purpose = invoice.purposeCode ? findPurposeCode(invoice.purposeCode) : undefined;
  const speed = details.clientPaySpeed;
  const country = useClientCountry({ invoice, details });
  return (
    <dl
      aria-label="Invoice facts"
      className="grid gap-x-[18px] gap-y-[22px] surface p-7 [--surface-radius:24px] sm:grid-cols-2 xl:grid-cols-3"
    >
      <Fact label="Issued">{formatDate(invoice.issuedOn)}</Fact>
      <Fact label="Due">{dueSentence(invoice, today)}</Fact>
      <Fact label="Client">
        <span title={invoice.client.email} className="[overflow-wrap:anywhere]">
          {clientLine(invoice.client.email, country)}
        </span>
      </Fact>
      {invoice.promise && invoice.dueState !== "paid" && (
        <Fact label="Client promised">
          {promiseStatus(invoice.promise, today)}
          {invoice.promise.note && (
            <span className="block text-sm font-normal text-muted-foreground">
              {invoice.promise.note}
            </span>
          )}
        </Fact>
      )}
      <Fact label="Work">{invoice.work}</Fact>
      <Fact label="Purpose code">
        {invoice.purposeCode ? (
          <>
            {invoice.purposeCode}
            {purpose && ` · ${purpose.label}`}
            <span className="block text-sm font-normal text-muted-foreground">
              Suggestion, confirm with your CA
            </span>
          </>
        ) : (
          "None chosen"
        )}
      </Fact>
      <Fact label="LUT">{lutSentence(details.underLut, details.note)}</Fact>
      <Fact label="Average days to get paid">
        {speed ? (
          <>
            {formatDays(speed.averageDays)}, {speed.onTimePercent}% on time ·{" "}
          </>
        ) : (
          "Nothing paid yet · "
        )}
        <Link
          href={clientHref(details.clientKey)}
          className="text-link underline underline-offset-2"
        >
          {invoice.client.name}
        </Link>
      </Fact>
    </dl>
  );
}

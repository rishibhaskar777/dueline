import Link from "next/link";
import { clientHref } from "@/components/clients/client-href";
import { countryName } from "@/lib/countries";
import { findPurposeCode } from "@/lib/export/purpose-codes";
import { formatDate } from "@/lib/format-date";
import { formatDays } from "@/lib/format-days";
import type { InvoiceDetailResponse } from "@/types";
import { dueSentence, lutSentence } from "./invoice-facts";

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

export function InvoiceFacts({ invoice, details, today }: InvoiceFactsProps) {
  const purpose = invoice.purposeCode ? findPurposeCode(invoice.purposeCode) : undefined;
  const speed = details.clientPaySpeed;
  const [local, domain] = invoice.client.email.split("@");
  return (
    <dl
      aria-label="Invoice facts"
      className="grid gap-x-[18px] gap-y-[22px] surface p-7 [--surface-radius:24px] sm:grid-cols-2 xl:grid-cols-3"
    >
      <Fact label="Issued">{formatDate(invoice.issuedOn)}</Fact>
      <Fact label="Due">{dueSentence(invoice, today)}</Fact>
      <Fact label="Client">
        <span className="block break-words">
          {local}
          <wbr />@{domain}
        </span>
        {countryName(invoice.client.country ?? null)}
      </Fact>
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

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
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

export function InvoiceFacts({ invoice, details, today }: InvoiceFactsProps) {
  const purpose = invoice.purposeCode ? findPurposeCode(invoice.purposeCode) : undefined;
  const speed = details.clientPaySpeed;
  return (
    <dl
      aria-label="Invoice facts"
      className="grid gap-x-8 gap-y-4 rounded-xl border border-line bg-card p-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      <Fact label="Issued">{formatDate(invoice.issuedOn)}</Fact>
      <Fact label="Due">{dueSentence(invoice, today)}</Fact>
      <Fact label="Client">
        {[invoice.client.email, countryName(invoice.client.country ?? null)]
          .filter(Boolean)
          .join(" · ")}
      </Fact>
      <Fact label="Work">{invoice.work}</Fact>
      <Fact label="Purpose code">
        {invoice.purposeCode ? (
          <>
            {invoice.purposeCode}
            {purpose && ` · ${purpose.label}`}
            <span className="block text-sm text-muted-foreground">
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
          className="text-blue underline underline-offset-2"
        >
          {invoice.client.name}
        </Link>
      </Fact>
    </dl>
  );
}

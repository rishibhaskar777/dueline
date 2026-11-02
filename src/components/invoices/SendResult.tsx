"use client";

import { Check, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { showStepHeading } from "@/components/invoices/step-focus";
import { Button, buttonVariants } from "@/components/ui/button";
import { sendInvoiceDraft } from "@/lib/api-client";
import { formatDate } from "@/lib/format-date";
import { formatMoney } from "@/lib/money/format";
import { cn } from "@/lib/utils";
import type { CreateInvoiceResponse } from "@/types";

interface SendResultProps {
  result: CreateInvoiceResponse;
  onCreateAnother: () => void;
}

const PILL = "h-11 px-5 font-bold";

export function SendResult({ result: first, onCreateAnother }: SendResultProps) {
  const [result, setResult] = useState(first);
  // Kept for every retry of this draft, so a double click or a timeout sends it once.
  const [sendRequestId] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { invoice, sent } = result;

  useEffect(showStepHeading, [sent]);

  async function retry() {
    setPending(true);
    setError(null);
    try {
      const response = await sendInvoiceDraft(invoice.id, sendRequestId);
      setResult(response);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("Could not send the invoice."));
    } finally {
      setPending(false);
    }
  }

  if (!sent) {
    return (
      <section
        aria-labelledby="result-title"
        className="grid max-w-2xl justify-items-start gap-3 surface p-8 [--surface-radius:28px]"
      >
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-tint-amber text-due-soon"
        >
          <TriangleAlert className="size-7" />
        </span>
        <h1 id="result-title" className="text-[34px] font-extrabold tracking-[-1px] md:text-[40px]">
          Draft created, not sent
        </h1>
        <p className="text-base">
          Invoice {invoice.number} is saved as a draft in PayPal, but it has not reached{" "}
          {invoice.client.name} yet. Retrying sends this same draft; it does not create a second
          invoice.
        </p>
        {error && (
          <p
            role="alert"
            className="rounded-2xl bg-tint-red px-4 py-3 text-sm font-semibold text-late"
          >
            {error.message}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2.5">
          <Button type="button" className={PILL} onClick={retry} disabled={pending}>
            {pending ? "Sending…" : "Retry sending"}
          </Button>
          <Link href="/receivables" className={cn(buttonVariants({ variant: "outline" }), PILL)}>
            View receivables
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="result-title"
      className="grid max-w-2xl justify-items-start gap-3 surface p-8 [--surface-radius:28px]"
    >
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-tint-green text-paid"
      >
        <Check className="size-7" />
      </span>
      <h1 id="result-title" className="text-[34px] font-extrabold tracking-[-1px] md:text-[40px]">
        Invoice {invoice.number} sent
      </h1>
      <p className="text-base">
        {invoice.client.name} has been emailed an invoice for {formatMoney(invoice.amount)}, due on{" "}
        {formatDate(invoice.dueOn)}.
      </p>
      {invoice.payLink && (
        <p className="text-sm">
          <a
            href={invoice.payLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-link underline underline-offset-4"
          >
            Open the PayPal payer link
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2.5">
        <Link href="/receivables" className={cn(buttonVariants(), PILL)}>
          View receivables
        </Link>
        <Button type="button" variant="outline" className={PILL} onClick={onCreateAnother}>
          Create another
        </Button>
      </div>
    </section>
  );
}

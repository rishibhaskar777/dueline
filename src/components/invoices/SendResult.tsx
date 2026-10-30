"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { sendInvoiceDraft } from "@/lib/api-client";
import { formatDate } from "@/lib/format-date";
import { formatMoney } from "@/lib/money/format";
import type { CreateInvoiceResponse } from "@/types";

interface SendResultProps {
  result: CreateInvoiceResponse;
  onCreateAnother: () => void;
}

export function SendResult({ result: first, onCreateAnother }: SendResultProps) {
  const [result, setResult] = useState(first);
  // Kept for every retry of this draft, so a double click or a timeout sends it once.
  const [sendRequestId] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { invoice, sent } = result;

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
        className="max-w-2xl rounded-xl border border-due-soon bg-white p-6"
      >
        <h2 id="result-title" className="text-xl font-semibold">
          Draft created, not sent
        </h2>
        <p className="mt-2 text-sm">
          Invoice {invoice.number} is saved as a draft in PayPal, but it has not reached{" "}
          {invoice.client.name} yet. Retrying sends this same draft; it does not create a second
          invoice.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-late">
            {error.message}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" onClick={retry} disabled={pending}>
            {pending ? "Sending…" : "Retry sending"}
          </Button>
          <Link href="/receivables" className={buttonVariants({ variant: "outline" })}>
            View receivables
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="result-title"
      className="max-w-2xl rounded-xl border border-paid bg-white p-6"
    >
      <h2 id="result-title" className="text-xl font-semibold text-paid">
        Invoice {invoice.number} sent
      </h2>
      <p className="mt-2 text-sm">
        {invoice.client.name} has been emailed an invoice for {formatMoney(invoice.amount)}, due on{" "}
        {formatDate(invoice.dueOn)}.
      </p>
      {invoice.payLink && (
        <p className="mt-3 text-sm">
          <a
            href={invoice.payLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue underline underline-offset-4"
          >
            Open the PayPal payer link
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/receivables" className={buttonVariants()}>
          View receivables
        </Link>
        <Button type="button" variant="outline" onClick={onCreateAnother}>
          Create another
        </Button>
      </div>
    </section>
  );
}

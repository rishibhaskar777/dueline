"use client";

import { Check, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { showStepHeading } from "@/components/invoices/step-focus";
import { Button, buttonVariants } from "@/components/ui/button";
import { createDepositAndBalance, sendInvoiceDraft } from "@/lib/api-client";
import { formatDate } from "@/lib/format-date";
import { formatMoney } from "@/lib/money/format";
import { cn } from "@/lib/utils";
import type { CreateSplitRequest, CreateSplitResponse } from "@/types";

interface SplitResultProps {
  request: CreateSplitRequest;
  first: CreateSplitResponse;
  onCreateAnother: () => void;
}

const PILL = "h-11 px-5 font-bold";
const SECTION = "grid max-w-2xl justify-items-start gap-3 surface p-8 [--surface-radius:28px]";
const TITLE = "text-[34px] font-extrabold tracking-[-1px] md:text-[40px]";

export function SplitResult({ request, first, onCreateAnother }: SplitResultProps) {
  const [response, setResponse] = useState(first);
  // Kept for every retry of the deposit's send, so a double click sends it once.
  const [sendRequestId] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { deposit, balance } = response;
  const stage = !deposit.sent ? "deposit_unsent" : balance ? "done" : "balance_missing";

  useEffect(showStepHeading, [stage]);

  // The same request again replays the deposit and makes only what is missing.
  async function retry(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      if (!deposit.sent) await sendInvoiceDraft(deposit.invoice.id, sendRequestId);
      setResponse(await createDepositAndBalance(request));
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("Could not finish the invoices."));
    } finally {
      setPending(false);
    }
  }

  if (stage !== "done") {
    const unsent = stage === "deposit_unsent";
    return (
      <section aria-labelledby="result-title" className={SECTION}>
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-tint-amber text-due-soon"
        >
          <TriangleAlert className="size-7" />
        </span>
        <h1 id="result-title" className={TITLE}>
          {unsent
            ? "Draft created, not sent"
            : "Deposit sent. The balance was not saved: try again"}
        </h1>
        <p className="text-base">
          {unsent
            ? `Deposit invoice ${deposit.invoice.number} is saved as a draft in PayPal, but it has not reached ${deposit.invoice.client.name} yet. Retrying sends this same draft and then saves the balance; it does not create a second invoice.`
            : `Deposit invoice ${deposit.invoice.number} is with ${deposit.invoice.client.name}. Trying again saves only the balance.`}
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
            {pending ? "Working…" : unsent ? "Retry sending" : "Save the balance"}
          </Button>
          <Link href="/receivables" className={cn(buttonVariants({ variant: "outline" }), PILL)}>
            View receivables
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="result-title" className={SECTION}>
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-tint-green text-paid"
      >
        <Check className="size-7" />
      </span>
      <h1 id="result-title" className={TITLE}>
        Deposit {deposit.invoice.number} sent
      </h1>
      <p className="text-base">
        {deposit.invoice.client.name} has been emailed a deposit invoice for{" "}
        {formatMoney(deposit.invoice.amount)}, due on {formatDate(deposit.invoice.dueOn)}.
      </p>
      <p className="text-base">
        The balance, invoice {balance?.number} for {balance && formatMoney(balance.amount)}, is
        saved as a draft due on {balance && formatDate(balance.dueOn)}. It waits in Ready to send on
        Home until you send it.
      </p>
      {deposit.invoice.payLink && (
        <p className="text-sm">
          <a
            href={deposit.invoice.payLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-link underline underline-offset-4"
          >
            Open the PayPal payer link for the deposit
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

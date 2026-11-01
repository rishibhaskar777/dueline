"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useDemoMode } from "@/components/demo/use-demo-mode";
import type { InvoiceDetailResponse } from "@/types";
import { HideFromDemoButton } from "./HideFromDemoButton";
import { CancelPanel } from "./CancelPanel";
import { RecordPaymentPanel } from "./RecordPaymentPanel";
import { RepeatPanel } from "./RepeatPanel";

type Panel = "record" | "cancel" | "repeat" | null;

interface InvoiceActionsProps extends Pick<InvoiceDetailResponse, "invoice" | "details"> {
  today: string;
  onChanged: () => void;
}

export function InvoiceActions({ invoice, details, today, onChanged }: InvoiceActionsProps) {
  const [panel, setPanel] = useState<Panel>(null);
  const { actions } = details;
  const inDemo = useDemoMode();
  const id = encodeURIComponent(invoice.id);

  function done(): void {
    setPanel(null);
    onChanged();
  }

  return (
    <section aria-labelledby="actions-title" className="rounded-xl border border-line bg-card p-6">
      <h2 id="actions-title" className="text-xl font-semibold">
        Actions
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.remind && (
          <Link href={`/nudges#invoice-${id}`} className={buttonVariants({ variant: "outline" })}>
            Send a reminder
          </Link>
        )}
        <Link
          href={`/invoices/new?duplicate=${id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Duplicate
        </Link>
        <Button type="button" variant="outline" onClick={() => setPanel("repeat")}>
          Repeat monthly
        </Button>
        {actions.recordPayment && (
          <Button
            type="button"
            variant="outline"
            disabled={!today}
            onClick={() => setPanel("record")}
          >
            Record a payment outside PayPal
          </Button>
        )}
        {inDemo && (
          <HideFromDemoButton
            invoiceId={invoice.id}
            hidden={details.hiddenFromDemo}
            onChanged={onChanged}
          />
        )}
        {actions.cancel && panel !== "cancel" && (
          <Button type="button" variant="destructive" onClick={() => setPanel("cancel")}>
            Cancel invoice
          </Button>
        )}
      </div>
      <div className="mt-4">
        {panel === "record" && (
          <RecordPaymentPanel
            invoiceId={invoice.id}
            invoiceNumber={invoice.number}
            issuedOn={invoice.issuedOn}
            today={today}
            onDone={done}
            onClose={() => setPanel(null)}
          />
        )}
        {panel === "repeat" && (
          <RepeatPanel
            invoiceId={invoice.id}
            invoiceNumber={invoice.number}
            onClose={() => setPanel(null)}
          />
        )}
        {panel === "cancel" && (
          <CancelPanel
            invoiceId={invoice.id}
            invoiceNumber={invoice.number}
            onDone={done}
            onClose={() => setPanel(null)}
          />
        )}
      </div>
    </section>
  );
}

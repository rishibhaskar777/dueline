"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDemoMode } from "@/components/demo/use-demo-mode";
import type { InvoiceDetailResponse } from "@/types";
import { HideFromDemoButton } from "./HideFromDemoButton";
import { CancelPanel } from "./CancelPanel";
import { RecordPaymentPanel } from "./RecordPaymentPanel";
import { RepeatPanel } from "./RepeatPanel";

type Panel = "record" | "cancel" | "repeat" | null;

const PILL = "h-11 px-5 font-bold";

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
    <section
      aria-labelledby="actions-title"
      className="surface p-7 [--h2-size:24px] [--surface-radius:24px]"
    >
      <h2 id="actions-title">Actions</h2>
      <div className="mt-3.5 flex flex-wrap gap-2.5">
        <Link
          href={`/invoices/new?duplicate=${id}`}
          className={cn(buttonVariants({ variant: "outline" }), PILL)}
        >
          Duplicate
        </Link>
        <Button type="button" variant="outline" className={PILL} onClick={() => setPanel("repeat")}>
          Repeat monthly
        </Button>
        {actions.recordPayment && (
          <Button
            type="button"
            variant="outline"
            className={PILL}
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
          <Button
            type="button"
            variant="ghost"
            className="h-11 border-[1.5px] border-mark-red px-5 font-bold text-late hover:bg-tint-red hover:text-late"
            onClick={() => setPanel("cancel")}
          >
            Cancel invoice
          </Button>
        )}
      </div>
      <div className="empty:hidden [&>*]:mt-4">
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

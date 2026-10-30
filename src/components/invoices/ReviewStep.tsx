"use client";

import { useRef, useState, type FormEvent } from "react";
import { ClientFields } from "@/components/invoices/ClientFields";
import { DetailsFields } from "@/components/invoices/DetailsFields";
import { DiscountFields } from "@/components/invoices/DiscountFields";
import { HeldPanel } from "@/components/invoices/HeldPanel";
import { InvoiceSummaryCard } from "@/components/invoices/InvoiceSummaryCard";
import {
  calculateTotals,
  describeHeld,
  fieldErrorsFromServer,
  toRequest,
  type FieldErrors,
  type HeldNotice,
  type InvoiceForm,
} from "@/components/invoices/invoice-form";
import { ItemsTable } from "@/components/invoices/ItemsTable";
import { SendResult } from "@/components/invoices/SendResult";
import { useFormReferences } from "@/components/invoices/use-form-references";
import { Button } from "@/components/ui/button";
import { ApiClientError, createInvoice } from "@/lib/api-client";
import type { CreateInvoiceResponse } from "@/types";

const SECTION = "rounded-xl border border-line bg-white p-6";
// The server holds these two for a while, and the same form retried later gets its stored result.
const HELD_CODES = ["duplicate_request", "paypal_timeout"];

interface ReviewStepProps {
  initial: { form: InvoiceForm; warnings: string[]; notice: string | null };
  onCreateAnother: () => void;
}

function describeFailure(error: unknown): string {
  if (!(error instanceof Error)) return "Could not create the invoice.";
  const debugId = error instanceof ApiClientError ? error.debugId : undefined;
  return debugId ? `${error.message} (PayPal debug ID ${debugId})` : error.message;
}

export function ReviewStep({ initial, onCreateAnother }: ReviewStepProps) {
  const [form, setForm] = useState(initial.form);
  // One ID for this form, reused for every retry, so PayPal never gets two invoices from one form.
  const [requestId] = useState(() => crypto.randomUUID());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [held, setHeld] = useState<HeldNotice | null>(null);
  // The request body the server first held, to tell whether the form was edited since.
  const heldBody = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CreateInvoiceResponse | null>(null);
  const { codes, demoEmail, today } = useFormReferences();

  const update = (changes: Partial<InvoiceForm>) => {
    setForm((previous) => ({ ...previous, ...changes }));
    setErrors({});
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const checked = toRequest(form, requestId, today);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }

    setPending(true);
    setFormError(null);
    setHeld(null);
    try {
      setResult(await createInvoice(checked.request));
    } catch (caught) {
      if (caught instanceof ApiClientError && HELD_CODES.includes(caught.code)) {
        const body = JSON.stringify(checked.request);
        heldBody.current ??= body;
        setHeld(describeHeld(caught.code, caught.message, heldBody.current !== body));
      } else if (caught instanceof ApiClientError && caught.code === "invalid_request") {
        const fields = fieldErrorsFromServer(caught.message);
        if (fields) setErrors(fields);
        else setFormError(caught.message);
      } else {
        setFormError(describeFailure(caught));
      }
    } finally {
      setPending(false);
    }
  }

  if (result) return <SendResult result={result} onCreateAnother={onCreateAnother} />;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label="New invoice"
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
    >
      <div className="grid gap-6">
        {initial.notice && <p className="text-sm text-muted-foreground">{initial.notice}</p>}

        {initial.warnings.length > 0 && (
          <section
            aria-labelledby="warnings-title"
            className="rounded-xl border border-due-soon bg-due-soon/10 p-4 text-sm"
          >
            <h2 id="warnings-title" className="font-semibold">
              Check these before you send
            </h2>
            <ul className="mt-2 grid gap-1">
              {initial.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="client-title" className={SECTION}>
          <h2 id="client-title" className="text-xl font-semibold">
            Client
          </h2>
          <ClientFields form={form} update={update} errors={errors} demoEmail={demoEmail} />
        </section>

        <section aria-labelledby="items-title" className={SECTION}>
          <h2 id="items-title" className="text-xl font-semibold">
            Items
          </h2>
          <div className="mt-4">
            <ItemsTable
              items={form.items}
              currency={form.currency}
              errors={errors}
              onChange={(items) => update({ items })}
            />
          </div>
        </section>

        <section aria-labelledby="details-title" className={SECTION}>
          <h2 id="details-title" className="text-xl font-semibold">
            Details
          </h2>
          <div className="mt-4">
            <DetailsFields
              form={form}
              update={update}
              errors={errors}
              codes={codes}
              today={today}
            />
          </div>
        </section>

        <section aria-labelledby="discount-title" className={SECTION}>
          <h2 id="discount-title" className="sr-only">
            Early-payment discount
          </h2>
          <DiscountFields form={form} update={update} errors={errors} />
        </section>
      </div>

      <div className="grid gap-4 lg:sticky lg:top-6">
        <InvoiceSummaryCard totals={calculateTotals(form)} />

        {held && <HeldPanel notice={held} onCreateAnother={onCreateAnother} />}
        {formError && (
          <p role="alert" className="text-sm text-late">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" disabled={pending} className="h-10">
          {pending ? "Creating and sending…" : "Create and send invoice"}
        </Button>
      </div>
    </form>
  );
}

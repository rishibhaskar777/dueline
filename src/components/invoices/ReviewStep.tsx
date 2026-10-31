"use client";

import { useState } from "react";
import { ClientFields } from "@/components/invoices/ClientFields";
import { DetailsFields } from "@/components/invoices/DetailsFields";
import { DiscountSection } from "@/components/invoices/DiscountSection";
import { HeldPanel } from "@/components/invoices/HeldPanel";
import { InvoiceSummaryCard } from "@/components/invoices/InvoiceSummaryCard";
import {
  calculateTotals,
  type FieldErrors,
  type InvoiceForm,
} from "@/components/invoices/invoice-form";
import { ItemsTable } from "@/components/invoices/ItemsTable";
import { SendResult } from "@/components/invoices/SendResult";
import { useFormReferences } from "@/components/invoices/use-form-references";
import { useSubmitInvoice } from "@/components/invoices/use-submit-invoice";
import { WarningsPanel } from "@/components/invoices/WarningsPanel";
import { Button } from "@/components/ui/button";
import type { ClientRisk } from "@/types";

const SECTION = "rounded-xl border border-line bg-white p-6";

interface ReviewStepProps {
  initial: {
    form: InvoiceForm;
    warnings: string[];
    notice: string | null;
    risk: ClientRisk | null;
  };
  onCreateAnother: () => void;
}

export function ReviewStep({ initial, onCreateAnother }: ReviewStepProps) {
  const [form, setForm] = useState(initial.form);
  const [errors, setErrors] = useState<FieldErrors>({});
  const { codes, demoEmail, today } = useFormReferences();
  const { pending, formError, held, result, submit } = useSubmitInvoice(form, today, setErrors);

  const update = (changes: Partial<InvoiceForm>) => {
    setForm((previous) => ({ ...previous, ...changes }));
    setErrors({});
  };

  if (result) return <SendResult result={result} onCreateAnother={onCreateAnother} />;

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label="New invoice"
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
    >
      <div className="grid gap-6">
        {initial.notice && <p className="text-sm text-muted-foreground">{initial.notice}</p>}

        <WarningsPanel warnings={initial.warnings} />

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

        <DiscountSection
          form={form}
          update={update}
          errors={errors}
          known={{
            name: initial.form.clientName,
            email: initial.form.clientEmail,
            risk: initial.risk,
          }}
        />
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

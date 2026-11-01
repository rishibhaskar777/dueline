"use client";

import { DiscountFields } from "@/components/invoices/DiscountFields";
import type { FieldErrors, InvoiceForm } from "@/components/invoices/invoice-form";

interface DiscountSectionProps {
  form: InvoiceForm;
  update: (changes: Partial<InvoiceForm>) => void;
  errors: FieldErrors;
}

export function DiscountSection({ form, update, errors }: DiscountSectionProps) {
  return (
    <section aria-labelledby="discount-title" className="rounded-xl border border-line bg-card p-6">
      <h2 id="discount-title" className="sr-only">
        Early-payment discount
      </h2>
      <DiscountFields form={form} update={update} errors={errors} />
    </section>
  );
}

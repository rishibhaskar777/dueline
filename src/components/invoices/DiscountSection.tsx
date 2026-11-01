"use client";

import { DiscountFields } from "@/components/invoices/DiscountFields";
import type { FieldErrors, InvoiceForm } from "@/components/invoices/invoice-form";
import { RiskRadar } from "@/components/invoices/RiskRadar";
import type { KnownRisk } from "@/components/shared/use-client-risk";

interface DiscountSectionProps {
  form: InvoiceForm;
  update: (changes: Partial<InvoiceForm>) => void;
  errors: FieldErrors;
  known: KnownRisk;
}

export function DiscountSection({ form, update, errors, known }: DiscountSectionProps) {
  return (
    <>
      <RiskRadar
        clientName={form.clientName}
        clientEmail={form.clientEmail}
        known={known}
        onOffer={({ percent, withinDays }) =>
          update({
            discountOn: true,
            discountPercent: String(percent),
            discountDays: String(withinDays),
          })
        }
      />
      <section
        aria-labelledby="discount-title"
        className="rounded-xl border border-line bg-card p-6"
      >
        <h2 id="discount-title" className="sr-only">
          Early-payment discount
        </h2>
        <DiscountFields form={form} update={update} errors={errors} />
      </section>
    </>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClientFields } from "@/components/invoices/ClientFields";
import { DetailsFields } from "@/components/invoices/DetailsFields";
import { HeldPanel } from "@/components/invoices/HeldPanel";
import { InvoiceSummaryCard } from "@/components/invoices/InvoiceSummaryCard";
import {
  calculateTotals,
  type FieldErrors,
  type InvoiceForm,
} from "@/components/invoices/invoice-form";
import { ItemsList } from "@/components/invoices/ItemsList";
import { NoticePills } from "@/components/invoices/NoticePills";
import { RiskRadar } from "@/components/invoices/RiskRadar";
import { SendResult } from "@/components/invoices/SendResult";
import { StepHeader } from "@/components/invoices/StepHeader";
import { useFormReferences } from "@/components/invoices/use-form-references";
import { useSubmitInvoice } from "@/components/invoices/use-submit-invoice";
import type { ClientRisk, Profile } from "@/types";

const SECTION = "surface p-[26px] [--h2-size:24px] [--surface-radius:24px]";

interface ReviewStepProps {
  initial: {
    form: InvoiceForm;
    warnings: string[];
    notice: string | null;
    risk: ClientRisk | null;
  };
  profile: Profile | null;
  onCreateAnother: () => void;
}

export function ReviewStep({ initial, profile, onCreateAnother }: ReviewStepProps) {
  const [form, setForm] = useState(initial.form);
  const [errors, setErrors] = useState<FieldErrors>({});
  const { codes, demoEmail, today } = useFormReferences();
  const { pending, formError, held, result, submit } = useSubmitInvoice(form, today, setErrors);
  const known = useMemo(
    () => ({
      name: initial.form.clientName,
      email: initial.form.clientEmail,
      risk: initial.risk,
    }),
    [initial],
  );

  const update = (changes: Partial<InvoiceForm>) => {
    setForm((previous) => ({ ...previous, ...changes }));
    setErrors({});
  };

  if (result) return <SendResult result={result} onCreateAnother={onCreateAnother} />;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <StepHeader state="review" />
      <NoticePills notice={initial.notice} warnings={initial.warnings} />
      <form
        onSubmit={submit}
        noValidate
        aria-labelledby="new-invoice-title"
        className="grid grid-cols-[minmax(0,1fr)] items-start gap-[18px] lg:grid-cols-[minmax(0,1fr)_340px]"
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          {profile && (!profile.yourName || !profile.businessName) && (
            <p className="rounded-[20px] bg-tint-amber px-5 py-3.5 text-[15px] font-semibold text-due-soon">
              Your name and business name are not on the invoice yet.{" "}
              <Link href="/profile" className="font-bold underline underline-offset-2">
                Add them in Profile
              </Link>
            </p>
          )}

          <section aria-labelledby="client-title" className={SECTION}>
            <h2 id="client-title">Client</h2>
            <ClientFields form={form} update={update} errors={errors} demoEmail={demoEmail} />
          </section>

          <RiskRadar
            clientName={form.clientName}
            clientEmail={form.clientEmail}
            known={known}
            form={form}
            update={update}
          />

          <section aria-labelledby="items-title" className={SECTION}>
            <h2 id="items-title">Items</h2>
            <div className="mt-3">
              <ItemsList
                items={form.items}
                currency={form.currency}
                errors={errors}
                defaultSac={profile?.defaultSac ?? ""}
                onChange={(items) => update({ items })}
              />
            </div>
          </section>

          <section aria-labelledby="details-title" className={SECTION}>
            <h2 id="details-title">Details</h2>
            <div className="mt-3.5">
              <DetailsFields
                form={form}
                update={update}
                errors={errors}
                codes={codes}
                profile={profile}
                today={today}
              />
            </div>
          </section>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:sticky lg:top-24">
          <InvoiceSummaryCard totals={calculateTotals(form)} pending={pending} />

          {held && <HeldPanel notice={held} onCreateAnother={onCreateAnother} />}
          {formError && (
            <p role="alert" className="text-sm text-late">
              {formError}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

"use client";

import { FieldError } from "@/components/invoices/FieldError";
import type { FieldErrors, InvoiceForm } from "@/components/invoices/invoice-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DiscountFieldsProps {
  form: InvoiceForm;
  update: (changes: Partial<InvoiceForm>) => void;
  errors: FieldErrors;
}

export function DiscountFields({ form, update, errors }: DiscountFieldsProps) {
  return (
    <div>
      <label className="flex items-start gap-2 text-sm font-medium">
        <Checkbox
          checked={form.discountOn}
          onCheckedChange={(checked) => update({ discountOn: checked })}
          className="mt-0.5"
        />
        Offer an early-payment discount
      </label>

      {form.discountOn && (
        <>
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="discount-percent">Discount (%)</Label>
              <Input
                id="discount-percent"
                inputMode="decimal"
                autoComplete="off"
                value={form.discountPercent}
                onChange={(event) => update({ discountPercent: event.target.value })}
                aria-invalid={Boolean(errors["discount.percent"])}
                aria-describedby={errors["discount.percent"] ? "discount-percent-error" : undefined}
                className="w-28 tabular-nums"
              />
              <FieldError id="discount-percent-error" message={errors["discount.percent"]} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="discount-days">Valid for (days)</Label>
              <Input
                id="discount-days"
                inputMode="numeric"
                autoComplete="off"
                value={form.discountDays}
                onChange={(event) => update({ discountDays: event.target.value })}
                aria-invalid={Boolean(errors["discount.withinDays"])}
                aria-describedby={errors["discount.withinDays"] ? "discount-days-error" : undefined}
                className="w-28 tabular-nums"
              />
              <FieldError id="discount-days-error" message={errors["discount.withinDays"]} />
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            PayPal takes {form.discountPercent || "0"}% off the invoice total. The invoice falls due{" "}
            {form.discountDays || "0"} days after it is sent, or on your due date if that is
            earlier, and its note tells your client the discount is valid until then.
          </p>
        </>
      )}
    </div>
  );
}

"use client";

import { FieldError } from "@/components/invoices/FieldError";
import { balanceDueOf, depositDueOf, upfrontPercent } from "@/components/invoices/deposit-plan";
import type { FieldErrors, InvoiceForm, UpfrontChoice } from "@/components/invoices/invoice-form";
import { Segmented } from "@/components/shared/Segmented";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const OPTIONS: { value: UpfrontChoice; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "30", label: "30%" },
  { value: "50", label: "50%" },
  { value: "custom", label: "Custom" },
];

interface DepositFieldsProps {
  form: InvoiceForm;
  update: (changes: Partial<InvoiceForm>) => void;
  errors: FieldErrors;
  today: string | undefined;
  // The client's own words about paying upfront, when the chat had any.
  quote: string | null;
}

export function DepositFields({ form, update, errors, today, quote }: DepositFieldsProps) {
  const on = form.upfront !== "off";
  const percent = upfrontPercent(form);

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <span id="upfront-label" className="text-sm font-bold">
          Ask for part upfront
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Ask for part upfront"
            options={OPTIONS}
            value={form.upfront}
            onChange={(upfront) => update({ upfront, discountOn: false })}
          />
          {form.upfront === "custom" && (
            <div className="grid gap-1">
              <Label htmlFor="upfront-custom" className="sr-only">
                Percent upfront
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="upfront-custom"
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.upfrontCustom}
                  onChange={(event) => update({ upfrontCustom: event.target.value })}
                  aria-invalid={Boolean(errors.upfrontCustom)}
                  aria-describedby={errors.upfrontCustom ? "upfront-custom-error" : undefined}
                  className="w-24 tabular-nums"
                />
                <span aria-hidden="true">%</span>
              </div>
              <FieldError id="upfront-custom-error" message={errors.upfrontCustom} />
            </div>
          )}
        </div>
        {quote && <p className="text-sm text-muted-foreground">Client wrote: “{quote}”</p>}
      </div>

      {on && (
        <>
          <p className="text-sm text-muted-foreground">
            PayPal cannot split one invoice in India, so Dueline sends a deposit invoice now and
            saves the balance as a draft that you send on delivery.
            {percent === null && " Enter a whole percent from 1 to 99."}
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="deposit-due-on" className="font-bold">
                Deposit due
              </Label>
              <Input
                id="deposit-due-on"
                type="date"
                min={today}
                value={today ? depositDueOf(form, today) : form.depositDueOn}
                onChange={(event) => update({ depositDueOn: event.target.value })}
                aria-invalid={Boolean(errors.depositDueOn)}
                aria-describedby={errors.depositDueOn ? "deposit-due-on-error" : undefined}
                className="tabular-nums"
              />
              <FieldError id="deposit-due-on-error" message={errors.depositDueOn} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="balance-due-on" className="font-bold">
                Balance due
              </Label>
              <Input
                id="balance-due-on"
                type="date"
                min={today}
                value={balanceDueOf(form)}
                onChange={(event) => update({ balanceDueOn: event.target.value })}
                aria-invalid={Boolean(errors.balanceDueOn)}
                aria-describedby={errors.balanceDueOn ? "balance-due-on-error" : undefined}
                className="tabular-nums"
              />
              <FieldError id="balance-due-on-error" message={errors.balanceDueOn} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { FieldError } from "@/components/invoices/FieldError";
import type { FieldErrors, InvoiceForm } from "@/components/invoices/invoice-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { currencySchema, type PurposeCode } from "@/types";

const NO_CODE = "none";
const CURRENCY_ITEMS = currencySchema.options.map((code) => ({ value: code, label: code }));

interface DetailsFieldsProps {
  form: InvoiceForm;
  update: (changes: Partial<InvoiceForm>) => void;
  errors: FieldErrors;
  codes: PurposeCode[];
  today: string | undefined;
}

export function DetailsFields({ form, update, errors, codes, today }: DetailsFieldsProps) {
  const codeItems = [
    { value: NO_CODE, label: "No purpose code" },
    ...codes.map((entry) => ({ value: entry.code, label: `${entry.code} ${entry.label}` })),
  ];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-4">
        <div className="grid gap-1.5">
          <Label id="currency-label">Currency</Label>
          <Select
            value={form.currency}
            items={CURRENCY_ITEMS}
            onValueChange={(value) => value && update({ currency: value })}
          >
            <SelectTrigger aria-labelledby="currency-label" className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="due-on">Due date</Label>
          <Input
            id="due-on"
            type="date"
            min={today}
            value={form.dueOn}
            onChange={(event) => update({ dueOn: event.target.value })}
            aria-invalid={Boolean(errors.dueOn)}
            aria-describedby={errors.dueOn ? "due-on-error" : undefined}
            className="w-44 tabular-nums"
          />
          <FieldError id="due-on-error" message={errors.dueOn} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label id="purpose-label">Purpose code</Label>
        <Select
          value={form.purposeCode ?? NO_CODE}
          items={codeItems}
          onValueChange={(value) =>
            value && update({ purposeCode: value === NO_CODE ? null : value, purposeReason: "" })
          }
        >
          <SelectTrigger
            aria-labelledby="purpose-label"
            aria-describedby="purpose-help"
            className="w-full max-w-lg"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-96">
            {codeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p id="purpose-help" className="text-xs text-muted-foreground">
          Suggestion, confirm with your CA.
          {form.purposeReason && ` ${form.purposeReason}`}
        </p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <Checkbox
          checked={form.includeLutNote}
          onCheckedChange={(checked) => update({ includeLutNote: checked })}
          className="mt-0.5"
        />
        Add the LUT line (export of services without IGST)
      </label>

      <div className="grid gap-1.5">
        <Label htmlFor="note">Note to the client</Label>
        <Textarea
          id="note"
          rows={3}
          maxLength={1000}
          value={form.note}
          onChange={(event) => update({ note: event.target.value })}
          aria-invalid={Boolean(errors.note)}
          aria-describedby={errors.note ? "note-error" : undefined}
        />
        <FieldError id="note-error" message={errors.note} />
      </div>
    </div>
  );
}

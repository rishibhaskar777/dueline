"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DiscountFields } from "@/components/invoices/DiscountFields";
import { FieldError } from "@/components/invoices/FieldError";
import { lutIssue, type FieldErrors, type InvoiceForm } from "@/components/invoices/invoice-form";
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
import { NO_CODE, purposeCodeItems } from "@/components/invoices/purpose-code-items";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format-date";
import { currencySchema, type Profile, type PurposeCode } from "@/types";

const CURRENCY_ITEMS = currencySchema.options.map((code) => ({ value: code, label: code }));

interface DetailsFieldsProps {
  form: InvoiceForm;
  update: (changes: Partial<InvoiceForm>) => void;
  errors: FieldErrors;
  codes: PurposeCode[];
  profile: Profile | null;
  today: string | undefined;
}

export function DetailsFields({ form, update, errors, codes, profile, today }: DetailsFieldsProps) {
  // The Select reads its items on every render, so a new array each time keeps it updating.
  const codeItems = useMemo(() => purposeCodeItems(codes), [codes]);
  const issue = profile ? lutIssue(profile, form.includeLutNote, today) : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="@container">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3.5 @xl:grid-cols-[160px_200px_minmax(0,1fr)]">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-1.5">
            <Label id="currency-label" className="font-bold">
              Currency
            </Label>
            <Select
              value={form.currency}
              items={CURRENCY_ITEMS}
              onValueChange={(value) => value && update({ currency: value })}
            >
              <SelectTrigger aria-labelledby="currency-label" className="w-full">
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

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-1.5">
            <Label htmlFor="due-on" className="font-bold">
              Due date
            </Label>
            <Input
              id="due-on"
              type="date"
              min={today}
              value={form.dueOn}
              onChange={(event) => update({ dueOn: event.target.value })}
              aria-invalid={Boolean(errors.dueOn)}
              aria-describedby={errors.dueOn ? "due-on-error" : undefined}
              className="tabular-nums"
            />
            <FieldError id="due-on-error" message={errors.dueOn} />
          </div>

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-1.5">
            <Label id="purpose-label" className="font-bold">
              RBI purpose code
            </Label>
            <Select
              value={form.purposeCode ?? NO_CODE}
              items={codeItems}
              onValueChange={(value) =>
                value &&
                update({ purposeCode: value === NO_CODE ? null : value, purposeReason: "" })
              }
            >
              <SelectTrigger
                aria-labelledby="purpose-label"
                aria-describedby="purpose-help"
                className="w-full"
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
          </div>
        </div>
      </div>
      <p id="purpose-help" className="text-sm text-muted-foreground">
        Suggestion, confirm with your CA.
        {form.purposeReason && ` ${form.purposeReason}`}
      </p>

      <div className="grid gap-1.5">
        <label className="flex items-center gap-2.5 font-semibold">
          <Checkbox
            checked={form.includeLutNote}
            onCheckedChange={(checked) => update({ includeLutNote: checked })}
            className="size-5"
          />
          Export under LUT (no IGST)
          {form.includeLutNote && profile?.lutArn && <> · ARN {profile.lutArn}</>}
        </label>
        {issue && (
          <p className="text-sm text-due-soon">
            {issue === "missing_arn"
              ? "Add your LUT ARN in "
              : `Your LUT ended on ${formatDate(profile?.lutValidUntil ?? "")}. Update it in `}
            <Link href="/profile" className="underline underline-offset-2">
              Profile
            </Link>
            .
          </p>
        )}
      </div>

      <DiscountFields form={form} update={update} errors={errors} />

      <div className="grid gap-1.5">
        <Label htmlFor="note" className="font-bold">
          Note to the client
        </Label>
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

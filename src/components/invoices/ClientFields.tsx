"use client";

import { FieldError } from "@/components/invoices/FieldError";
import type { FieldErrors, InvoiceForm } from "@/components/invoices/invoice-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMMON_COUNTRY_CODES, COUNTRIES } from "@/lib/countries";

const NOT_SET = "none";

// Common client countries first, then every country once.
const COUNTRY_ITEMS = [
  { value: NOT_SET, label: "Not set" },
  ...COMMON_COUNTRY_CODES.flatMap((code) => COUNTRIES.filter((country) => country.code === code)),
  ...COUNTRIES.filter(({ code }) => !COMMON_COUNTRY_CODES.includes(code)),
].map((item) => ("code" in item ? { value: item.code, label: item.name } : item));

interface ClientFieldsProps {
  form: InvoiceForm;
  update: (changes: Partial<InvoiceForm>) => void;
  errors: FieldErrors;
  demoEmail: string | null;
}

export function ClientFields({ form, update, errors, demoEmail }: ClientFieldsProps) {
  return (
    <>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="client-name">Client name</Label>
          <Input
            id="client-name"
            autoComplete="off"
            value={form.clientName}
            onChange={(event) => update({ clientName: event.target.value })}
            aria-invalid={Boolean(errors["client.name"])}
            aria-describedby={errors["client.name"] ? "client-name-error" : undefined}
          />
          <FieldError id="client-name-error" message={errors["client.name"]} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="client-email">Client email</Label>
          <Input
            id="client-email"
            type="email"
            autoComplete="off"
            value={form.clientEmail}
            onChange={(event) => update({ clientEmail: event.target.value })}
            aria-invalid={Boolean(errors["client.email"])}
            aria-describedby={errors["client.email"] ? "client-email-error" : undefined}
          />
          <FieldError id="client-email-error" message={errors["client.email"]} />
        </div>
      </div>
      <div className="mt-4 grid gap-1.5 sm:max-w-xs">
        <Label id="client-country-label">Client country (optional)</Label>
        <Select
          value={form.clientCountry || NOT_SET}
          items={COUNTRY_ITEMS}
          onValueChange={(value) =>
            update({ clientCountry: !value || value === NOT_SET ? "" : value })
          }
        >
          <SelectTrigger aria-labelledby="client-country-label">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Goes on the invoice as the client&apos;s billing country and in your export register.
        </p>
      </div>
      {demoEmail && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <p>The PayPal sandbox can only email sandbox buyers.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => update({ clientEmail: demoEmail })}
          >
            Send to the demo buyer
          </Button>
        </div>
      )}
    </>
  );
}

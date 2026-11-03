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
      <div className="@container mt-4">
        <div className="grid gap-3.5 @xl:grid-cols-2">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-1.5">
            <Label htmlFor="client-name" className="font-bold">
              Client name
            </Label>
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
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-1.5">
            <Label htmlFor="client-contact" className="font-bold">
              Contact name (optional)
            </Label>
            <Input
              id="client-contact"
              autoComplete="off"
              value={form.clientContactName}
              onChange={(event) => update({ clientContactName: event.target.value })}
              aria-invalid={Boolean(errors["client.contactName"])}
              aria-describedby={errors["client.contactName"] ? "client-contact-error" : undefined}
            />
            <FieldError id="client-contact-error" message={errors["client.contactName"]} />
          </div>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-1.5">
            <Label htmlFor="client-email" className="font-bold">
              Client email
            </Label>
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
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-1.5">
            <Label id="client-country-label" className="font-bold">
              Country (optional)
            </Label>
            <Select
              value={form.clientCountry || NOT_SET}
              items={COUNTRY_ITEMS}
              onValueChange={(value) =>
                update({ clientCountry: !value || value === NOT_SET ? "" : value })
              }
            >
              <SelectTrigger aria-labelledby="client-country-label" className="w-full">
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
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        The contact name is who your reminders greet. The country goes on the invoice as the
        client&apos;s billing country and in your export register.
      </p>
      {demoEmail && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <p>The PayPal sandbox can only email sandbox buyers.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="font-bold"
            onClick={() => update({ clientEmail: demoEmail })}
          >
            Send to the demo buyer
          </Button>
        </div>
      )}
    </>
  );
}

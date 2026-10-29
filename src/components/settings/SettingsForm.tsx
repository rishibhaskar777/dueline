"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PayoutCalculator } from "@/components/settings/PayoutCalculator";
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
import { ApiClientError, getSettings, saveSettings } from "@/lib/api-client";
import { formatDate } from "@/lib/format-date";
import { currencySchema, type CurrencyCode, type Settings } from "@/types";

const CURRENCIES = currencySchema.options;
const SOURCE_ITEMS = [
  { value: "ecb", label: "ECB daily rate" },
  { value: "manual", label: "My own rates" },
] as const;

interface FormValues {
  feePercent: string;
  fixedFees: Record<CurrencyCode, string>;
  fxMarkupPercent: string;
  rateSource: Settings["rateSource"];
  marketRates: Record<CurrencyCode, string>;
}

function toForm(settings: Settings): FormValues {
  return {
    feePercent: String(settings.feePercent),
    fixedFees: settings.fixedFees,
    fxMarkupPercent: String(settings.fxMarkupPercent),
    rateSource: settings.rateSource,
    marketRates: Object.fromEntries(
      CURRENCIES.map((code) => [code, String(settings.marketRates[code])]),
    ) as Record<CurrencyCode, string>,
  };
}

function isNumber(text: string): boolean {
  return text.trim() !== "" && !Number.isNaN(Number(text));
}

function toSettings(form: FormValues, ratesUpdatedOn: string): Settings | null {
  const numeric = [form.feePercent, form.fxMarkupPercent, ...Object.values(form.marketRates)];
  if (!numeric.every(isNumber)) return null;

  return {
    feePercent: Number(form.feePercent),
    fixedFees: form.fixedFees,
    fxMarkupPercent: Number(form.fxMarkupPercent),
    rateSource: form.rateSource,
    marketRates: Object.fromEntries(
      CURRENCIES.map((code) => [code, Number(form.marketRates[code])]),
    ) as Record<CurrencyCode, number>,
    ratesUpdatedOn,
  };
}

interface SaveError {
  field: string;
  message: string;
}

function toSaveError(error: unknown): SaveError {
  if (error instanceof ApiClientError && error.code === "invalid_request") {
    const [field, ...rest] = error.message.split(": ");
    if (rest.length > 0) return { field, message: rest.join(": ") };
  }
  return {
    field: "",
    message: error instanceof Error ? error.message : "Could not save your settings.",
  };
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}

function NumberField({ id, label, value, onChange, invalid }: NumberFieldProps) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid}
        className="w-32 tabular-nums"
      />
    </div>
  );
}

interface RatesTableProps {
  form: FormValues;
  update: (changes: Partial<FormValues>) => void;
  manual: boolean;
  invalidField: string;
  caption: string;
}

function RatesTable({ form, update, manual, invalidField, caption }: RatesTableProps) {
  return (
    <table className="mt-6 w-full text-sm">
      <caption className="pb-2 text-left text-muted-foreground">{caption}</caption>
      <thead>
        <tr className="text-left text-muted-foreground">
          <th scope="col" className="py-2 font-medium">
            Currency
          </th>
          <th scope="col" className="py-2 font-medium">
            Fixed fee
          </th>
          <th scope="col" className="py-2 font-medium">
            Market rate (₹ per unit)
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {CURRENCIES.map((code) => (
          <tr key={code}>
            <th scope="row" className="py-2 text-left font-medium">
              {code}
            </th>
            <td className="py-2 pr-3">
              <Label htmlFor={`fixed-fee-${code}`} className="sr-only">
                {code} fixed fee
              </Label>
              <Input
                id={`fixed-fee-${code}`}
                inputMode="decimal"
                autoComplete="off"
                value={form.fixedFees[code]}
                onChange={(event) =>
                  update({ fixedFees: { ...form.fixedFees, [code]: event.target.value } })
                }
                aria-invalid={invalidField === `fixedFees.${code}`}
                className="w-24 tabular-nums"
              />
            </td>
            <td className="py-2">
              <Label htmlFor={`market-rate-${code}`} className="sr-only">
                {code} market rate
              </Label>
              <Input
                id={`market-rate-${code}`}
                inputMode="decimal"
                autoComplete="off"
                readOnly={!manual}
                value={form.marketRates[code]}
                onChange={(event) =>
                  update({ marketRates: { ...form.marketRates, [code]: event.target.value } })
                }
                aria-invalid={invalidField === `marketRates.${code}`}
                className="w-28 tabular-nums read-only:bg-ground read-only:text-muted-foreground"
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<FormValues | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<SaveError | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    let current = true;
    getSettings().then(
      (loaded) => {
        if (!current) return;
        setSettings(loaded);
        setForm(toForm(loaded));
        setLoadError(null);
      },
      (error: unknown) => {
        if (current) {
          setLoadError(error instanceof Error ? error.message : "Could not load your settings.");
        }
      },
    );
    return () => {
      current = false;
    };
  }, [attempt]);

  if (loadError) {
    return (
      <div role="alert" className="max-w-xl rounded-xl border border-line bg-white p-6">
        <p className="text-late">{loadError}</p>
        <Button variant="outline" className="mt-4" onClick={() => setAttempt(attempt + 1)}>
          Try again
        </Button>
      </div>
    );
  }
  if (!settings || !form) {
    return <p className="text-muted-foreground">Loading your settings…</p>;
  }

  const update = (changes: Partial<FormValues>) => setForm({ ...form, ...changes });
  const manual = form.rateSource === "manual";
  const invalidField = saveError?.field ?? "";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || !settings) return;
    const next = toSettings(form, settings.ratesUpdatedOn);
    if (!next) {
      setSaveError({ field: "", message: "Enter a number in every fee and rate field." });
      return;
    }

    setPending(true);
    setSaveError(null);
    try {
      const saved = await saveSettings(next);
      setSettings(saved);
      setForm(toForm(saved));
      setSavedCount((count) => count + 1);
      toast.success("Settings saved");
    } catch (error) {
      setSaveError(toSaveError(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <form
        onSubmit={onSubmit}
        aria-labelledby="fees-title"
        className="rounded-xl border border-line bg-white p-6"
      >
        <h2 id="fees-title" className="text-xl font-semibold">
          PayPal fees and rates
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Defaults are PayPal India&apos;s published fees for international commercial payments.
        </p>

        <div className="mt-5 flex flex-wrap gap-4">
          <NumberField
            id="fee-percent"
            label="PayPal fee (%)"
            value={form.feePercent}
            onChange={(feePercent) => update({ feePercent })}
            invalid={invalidField === "feePercent"}
          />
          <NumberField
            id="fx-markup"
            label="Conversion markup (%)"
            value={form.fxMarkupPercent}
            onChange={(fxMarkupPercent) => update({ fxMarkupPercent })}
            invalid={invalidField === "fxMarkupPercent"}
          />
          <div className="grid gap-1.5">
            <Label id="rate-source-label">Rate source</Label>
            <Select
              value={form.rateSource}
              items={SOURCE_ITEMS}
              onValueChange={(value) => value && update({ rateSource: value })}
            >
              <SelectTrigger aria-labelledby="rate-source-label" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <RatesTable
          form={form}
          update={update}
          manual={manual}
          invalidField={invalidField}
          caption={
            manual
              ? `Your own rates, last changed ${formatDate(settings.ratesUpdatedOn)}`
              : `ECB rates of ${formatDate(settings.ratesUpdatedOn)}`
          }
        />

        {saveError && (
          <p role="alert" className="mt-4 text-sm text-late">
            {saveError.field ? `${saveError.field}: ${saveError.message}` : saveError.message}
          </p>
        )}
        <Button type="submit" disabled={pending} className="mt-6">
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </form>

      <PayoutCalculator settingsVersion={savedCount} rateSource={settings.rateSource} />
    </div>
  );
}

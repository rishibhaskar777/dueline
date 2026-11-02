"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { OFFLINE_RATES_LABEL } from "@/components/shared/rate-source";
import { useOffline } from "@/components/shared/use-offline";
import { AutomationSettings } from "@/components/settings/AutomationSettings";
import { PayoutCalculator } from "@/components/settings/PayoutCalculator";
import { useLoad } from "@/components/shared/use-load";
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
import { ApiClientError, getDashboard, getSettings, saveSettings } from "@/lib/api-client";
import { formatDate } from "@/lib/format-date";
import { automationOf } from "./automation-form";
import { averageGap } from "./payout-lines";
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

function toSettings(form: FormValues, current: Settings): Settings | null {
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
    ratesUpdatedOn: current.ratesUpdatedOn,
    ...automationOf(current),
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
      <Label htmlFor={id} className="font-bold">
        {label}
      </Label>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid}
        className="h-12 text-base font-medium tabular-nums"
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
  gaps: Partial<Record<CurrencyCode, number | null>>;
}

const CELL = "px-2.5 py-2 max-md:p-0";
// Below md the header row is hidden, so each cell carries its own label.
const LABELLED =
  "max-md:before:mb-1 max-md:before:block max-md:before:text-xs max-md:before:font-semibold max-md:before:text-muted-foreground max-md:before:content-[attr(data-label)]";
const HEAD = "px-2.5 py-2.5 text-left text-sm font-semibold text-muted-foreground";

function RatesTable({ form, update, manual, invalidField, caption, gaps }: RatesTableProps) {
  return (
    <div className="md:overflow-x-auto">
      <table className="w-full caption-bottom border-collapse text-[15px]">
        <caption className="pt-3 text-left text-[13px] text-subtle">
          {caption}. PayPal&apos;s sandbox can charge differently from live pricing.
        </caption>
        <thead className="max-md:sr-only">
          <tr>
            <th scope="col" className={HEAD}>
              Currency
            </th>
            <th scope="col" className={HEAD}>
              Fixed fee
            </th>
            <th scope="col" className={HEAD}>
              Market rate (₹ per unit)
            </th>
            <th scope="col" className={HEAD}>
              Vs 30-day average
            </th>
          </tr>
        </thead>
        <tbody className="max-md:block">
          {CURRENCIES.map((code) => (
            <tr
              key={code}
              className="border-t border-bar-line max-md:grid max-md:grid-cols-2 max-md:gap-x-3 max-md:gap-y-2 max-md:py-3"
            >
              <th
                scope="row"
                className="px-2.5 py-2.5 text-left font-bold max-md:col-span-2 max-md:px-0 max-md:py-0"
              >
                {code}
              </th>
              <td className={`${CELL} ${LABELLED}`} data-label="Fixed fee">
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
                  className="h-10 w-24 rounded-xl tabular-nums max-md:w-full"
                />
              </td>
              <td className={`${CELL} ${LABELLED}`} data-label="Market rate (₹ per unit)">
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
                  className="h-10 w-28 rounded-xl tabular-nums max-md:w-full read-only:bg-transparent read-only:text-foreground"
                />
              </td>
              <td
                className={`${CELL} ${LABELLED} text-muted-foreground max-md:col-span-2 md:whitespace-nowrap`}
                data-label="Vs 30-day average"
              >
                {averageGap(gaps[code] ?? null)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
  const offline = useOffline();
  const { state: dashboard } = useLoad(getDashboard);

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
      <div role="alert" className="max-w-xl surface p-6">
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
    const next = toSettings(form, settings);
    if (!next) {
      setSaveError({ field: "", message: "Enter a number in every fee and rate field." });
      return;
    }

    setPending(true);
    setSaveError(null);
    try {
      // The automation settings have their own form, so the latest ones are read before saving.
      const saved = await saveSettings({ ...next, ...automationOf(await getSettings()) });
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

  const gaps = Object.fromEntries(
    dashboard.kind === "ready"
      ? dashboard.data.rates.lines.map((line) => [line.currency, line.percentVsAverage])
      : [],
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-[18px] lg:grid-cols-[minmax(0,1fr)_360px]">
      <form
        onSubmit={onSubmit}
        aria-labelledby="fees-title"
        className="surface flex flex-col gap-[18px] p-7 max-md:p-5 [--h2-size:24px] [--h2-tracking:-0.4px] [--surface-radius:28px]"
      >
        <h2 id="fees-title">PayPal fees and rates</h2>
        <p className="text-[15px] text-muted-foreground">
          Defaults are PayPal India&apos;s published fees for international commercial payments.
        </p>

        <div className="grid gap-3.5 sm:grid-cols-3">
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
            <Label id="rate-source-label" className="font-bold">
              Rate source
            </Label>
            <Select
              value={form.rateSource}
              items={SOURCE_ITEMS}
              onValueChange={(value) => value && update({ rateSource: value })}
            >
              <SelectTrigger aria-labelledby="rate-source-label" className="h-12 w-full text-base">
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
          gaps={gaps}
          caption={
            offline
              ? `${OFFLINE_RATES_LABEL}, last changed ${formatDate(settings.ratesUpdatedOn)}`
              : manual
                ? `Your own rates, last changed ${formatDate(settings.ratesUpdatedOn)}`
                : `ECB rates of ${formatDate(settings.ratesUpdatedOn)}`
          }
        />

        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
          {saveError && (
            <p role="alert" className="text-sm font-semibold text-late">
              {saveError.field ? `${saveError.field}: ${saveError.message}` : saveError.message}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending} className="px-[26px] font-bold">
            {pending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>

      <aside aria-label="Estimate and morning settings" className="grid gap-4">
        <PayoutCalculator settingsVersion={savedCount} rateSource={settings.rateSource} />
        <AutomationSettings />
      </aside>
    </div>
  );
}

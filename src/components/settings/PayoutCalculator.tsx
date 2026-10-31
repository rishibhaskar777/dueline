"use client";

import { useState } from "react";
import { FactRow } from "@/components/shared/FactRow";
import { usePayoutEstimate } from "@/components/shared/use-payout-estimate";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format-date";
import { formatMoney, formatRate, formatRupees } from "@/lib/money/format";
import {
  currencySchema,
  moneySchema,
  type CurrencyCode,
  type PayoutEstimate,
  type RateSource,
} from "@/types";

const CURRENCY_ITEMS = currencySchema.options.map((code) => ({ value: code, label: code }));

function rateNote(estimate: PayoutEstimate): string {
  const source = estimate.marketRateSource === "ecb" ? "ECB rate" : "Your own rate";
  return `${source} of ${formatDate(estimate.marketRateDate)}`;
}

interface PayoutCalculatorProps {
  settingsVersion: number;
  rateSource: RateSource;
}

export function PayoutCalculator({ settingsVersion, rateSource }: PayoutCalculatorProps) {
  const [amount, setAmount] = useState("1000.00");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const parsed = moneySchema.safeParse({ currency, value: amount });
  const { estimate, failure } = usePayoutEstimate(
    parsed.success ? parsed.data : null,
    settingsVersion,
  );

  return (
    <section
      aria-labelledby="calculator-title"
      className="rounded-xl border border-line bg-white p-6"
    >
      <h2 id="calculator-title" className="text-xl font-semibold">
        What reaches your bank
      </h2>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="calculator-amount">Invoice amount</Label>
          <Input
            id="calculator-amount"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(event) => setAmount(event.target.value.trim())}
            aria-invalid={!parsed.success}
            aria-describedby={parsed.success ? undefined : "calculator-amount-error"}
            className="w-36 tabular-nums"
          />
        </div>
        <div className="grid gap-1.5">
          <Label id="calculator-currency-label">Currency</Label>
          <Select
            value={currency}
            items={CURRENCY_ITEMS}
            onValueChange={(value) => value && setCurrency(value)}
          >
            <SelectTrigger aria-labelledby="calculator-currency-label" className="w-24">
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
      </div>
      {!parsed.success && (
        <p id="calculator-amount-error" role="alert" className="mt-2 text-sm text-late">
          Enter an amount above zero with at most 2 decimals.
        </p>
      )}

      <div aria-live="polite" className="mt-6 min-h-64">
        {failure && <p className="text-sm text-late">{failure}</p>}
        {!failure && parsed.success && !estimate && (
          <p className="text-sm text-muted-foreground">Working out the estimate…</p>
        )}
        {estimate && parsed.success && (
          <dl className="divide-y divide-line text-sm">
            <FactRow label="Invoice amount" value={formatMoney(estimate.gross)} />
            <FactRow label="PayPal fee" value={`− ${formatMoney(estimate.fee)}`} />
            <FactRow label="After fee" value={formatMoney(estimate.net)} />
            <FactRow
              label={`Market rate (${rateNote(estimate)})`}
              value={`₹${formatRate(estimate.marketRate)}`}
            />
            <FactRow label="PayPal's rate" value={`₹${formatRate(estimate.conversionRate)}`} />
            <div className="py-4">
              <dt className="text-muted-foreground">You receive</dt>
              <dd className="mt-1 font-heading text-4xl font-semibold text-navy tabular-nums">
                {formatRupees(estimate.netInr)}
              </dd>
            </div>
            <FactRow
              label="Lost to fees and conversion"
              value={`${formatRupees(estimate.lossInr)} (${estimate.lossPercent.toFixed(1)}%)`}
            />
          </dl>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Estimate from PayPal India&apos;s published fees and{" "}
        {rateSource === "ecb" ? "the ECB rate" : "your own rates"}. Your real figures appear on each
        paid invoice.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        PayPal&apos;s sandbox can charge differently from live pricing.
      </p>
    </section>
  );
}

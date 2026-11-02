"use client";

import { useState } from "react";
import { OFFLINE_RATES_LABEL } from "@/components/shared/rate-source";
import { useOffline } from "@/components/shared/use-offline";
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
import { lostLine } from "./payout-lines";

const CURRENCY_ITEMS = currencySchema.options.map((code) => ({ value: code, label: code }));

function rateNote(estimate: PayoutEstimate, offline: boolean): string {
  if (offline) return `${OFFLINE_RATES_LABEL} of ${formatDate(estimate.marketRateDate)}`;
  const source = estimate.marketRateSource === "ecb" ? "ECB rate" : "Your own rate";
  return `${source} of ${formatDate(estimate.marketRateDate)}`;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-[15px]">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

interface PayoutCalculatorProps {
  settingsVersion: number;
  rateSource: RateSource;
}

export function PayoutCalculator({ settingsVersion, rateSource }: PayoutCalculatorProps) {
  const [amount, setAmount] = useState("1000.00");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const offline = useOffline();
  const parsed = moneySchema.safeParse({ currency, value: amount });
  const { estimate, failure } = usePayoutEstimate(
    parsed.success ? parsed.data : null,
    settingsVersion,
  );

  return (
    <section
      aria-labelledby="calculator-title"
      className="surface flex flex-col gap-2.5 p-6 [--h2-size:20px] [--h2-tracking:-0.2px] [--surface-radius:24px]"
    >
      <h2 id="calculator-title">What reaches your bank</h2>

      <Label htmlFor="calculator-amount" className="text-sm font-normal text-muted-foreground">
        For an invoice of
      </Label>
      <div className="flex items-center gap-3">
        <Input
          id="calculator-amount"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(event) => setAmount(event.target.value.trim())}
          aria-invalid={!parsed.success}
          aria-describedby={parsed.success ? undefined : "calculator-amount-error"}
          className="h-14 min-w-0 flex-1 rounded-2xl px-3.5 font-heading text-[26px] font-extrabold tracking-[-0.5px] tabular-nums sm:text-4xl md:text-4xl"
        />
        <div className="grid">
          <span id="calculator-currency-label" className="sr-only">
            Currency
          </span>
          <Select
            value={currency}
            items={CURRENCY_ITEMS}
            onValueChange={(value) => value && setCurrency(value)}
          >
            <SelectTrigger aria-labelledby="calculator-currency-label" className="h-14 w-24">
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
        <p id="calculator-amount-error" role="alert" className="text-sm font-semibold text-late">
          Enter an amount above zero with at most 2 decimals.
        </p>
      )}

      <div aria-live="polite" className="flex min-h-56 flex-col gap-2.5">
        {failure && <p className="text-sm text-late">{failure}</p>}
        {!failure && parsed.success && !estimate && (
          <p className="text-sm text-muted-foreground">Working out the estimate…</p>
        )}
        {estimate && parsed.success && (
          <>
            <dl className="flex flex-col gap-2.5 border-t border-bar-line pt-2">
              <Line label="PayPal fee" value={`− ${formatMoney(estimate.fee)}`} />
              <Line label="After PayPal's fee" value={formatMoney(estimate.net)} />
              <Line label="Market rate" value={`₹${formatRate(estimate.marketRate)}`} />
              <Line label="PayPal's rate" value={`₹${formatRate(estimate.conversionRate)}`} />
            </dl>
            <p className="flex items-baseline justify-between gap-3 rounded-[18px] bg-tint-blue p-4 text-blue">
              <span className="font-bold">You receive</span>
              <span className="font-heading text-[28px] font-extrabold tabular-nums">
                {formatRupees(estimate.netInr)}
              </span>
            </p>
            <p className="text-sm font-semibold text-late">{lostLine(estimate)}</p>
          </>
        )}
      </div>

      <p className="text-[13px] text-subtle">
        {estimate && parsed.success && <>Market rate: {rateNote(estimate, offline)}. </>}
        Estimate from PayPal India&apos;s published fees and{" "}
        {offline ? "the saved rates" : rateSource === "ecb" ? "the ECB rate" : "your own rates"}.
        Your real figures appear on each paid invoice. PayPal&apos;s sandbox can charge differently
        from live pricing.
      </p>
    </section>
  );
}

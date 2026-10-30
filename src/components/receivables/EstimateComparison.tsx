"use client";

import { useEffect, useState } from "react";
import { estimatePayout } from "@/lib/api-client";
import { formatMoney, formatRupees } from "@/lib/money/format";
import type { InvoiceSummary, PayoutEstimate } from "@/types";
import { describeFeeDifference, describeRupeeDifference } from "./payout-comparison";

type Outcome = { estimate: PayoutEstimate } | { message: string } | null;

interface RowProps {
  label: string;
  estimate: string;
  actual: string;
}

function Row({ label, estimate, actual }: RowProps) {
  return (
    <tr>
      <th scope="row" className="py-2 text-left font-normal text-muted-foreground">
        {label}
      </th>
      <td className="py-2 text-right tabular-nums">{estimate}</td>
      <td className="py-2 text-right font-medium tabular-nums">{actual}</td>
    </tr>
  );
}

export function EstimateComparison({ invoice }: { invoice: InvoiceSummary }) {
  const [outcome, setOutcome] = useState<Outcome>(null);
  const { actualPayout } = invoice;
  const { currency, value } = invoice.amount;
  const hasActual = actualPayout !== null;

  useEffect(() => {
    if (!hasActual) return;
    let current = true;
    estimatePayout({ currency, value }).then(
      (estimate) => current && setOutcome({ estimate }),
      (error: unknown) =>
        current &&
        setOutcome({
          message: error instanceof Error ? error.message : "Could not work out the estimate.",
        }),
    );
    return () => {
      current = false;
    };
  }, [currency, value, hasActual]);

  if (!actualPayout) {
    return (
      <p className="text-sm text-muted-foreground">
        PayPal has not reported its figures for this payment yet. Rupees are an estimate.
      </p>
    );
  }
  if (!outcome) {
    return <p className="text-sm text-muted-foreground">Comparing with the estimate…</p>;
  }
  if ("message" in outcome) return <p className="text-sm text-late">{outcome.message}</p>;

  const { estimate } = outcome;
  const actualInr = actualPayout.netInr ?? invoice.payoutInr;

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground">
            <th scope="col" className="py-2 text-left font-medium">
              <span className="sr-only">Figure</span>
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Estimate (published fees)
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              PayPal actual
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          <Row
            label="Fee"
            estimate={formatMoney(estimate.fee)}
            actual={formatMoney(actualPayout.fee)}
          />
          <Row
            label="After fee"
            estimate={formatMoney(estimate.net)}
            actual={formatMoney(actualPayout.net)}
          />
          <Row
            label="Rupees"
            estimate={formatRupees(estimate.netInr)}
            actual={actualInr === null ? "–" : formatRupees(actualInr)}
          />
        </tbody>
      </table>
      <p className="mt-3 text-sm">{describeFeeDifference(estimate.fee, actualPayout.fee)}</p>
      {actualInr !== null && (
        <p className="text-sm">{describeRupeeDifference(estimate.netInr, actualInr)}</p>
      )}
      {actualPayout.exchangeRate === null && (
        <p className="mt-2 text-sm text-muted-foreground">
          PayPal reports the conversion when you withdraw. Rupees use today&apos;s ECB rate less
          PayPal&apos;s markup.
        </p>
      )}
    </div>
  );
}

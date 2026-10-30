"use client";

import { useEffect, useState } from "react";
import type { InvoiceTotals } from "@/components/invoices/invoice-form";
import { estimatePayout } from "@/lib/api-client";
import { formatMoney, formatRupees } from "@/lib/money/format";
import type { Money, PayoutEstimate } from "@/types";

const TYPING_PAUSE_MS = 300;

type Outcome = { key: string; estimate: PayoutEstimate } | { key: string; message: string };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function usePayoutEstimate(total: Money | null): {
  estimate: PayoutEstimate | null;
  failure: string | null;
} {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const currency = total?.currency;
  const value = total?.value;
  const key = `${currency}:${value}`;

  useEffect(() => {
    if (!currency || !value) return;
    let current = true;
    const timer = setTimeout(() => {
      estimatePayout({ currency, value }).then(
        (estimate) => current && setOutcome({ key, estimate }),
        (error: unknown) =>
          current &&
          setOutcome({
            key,
            message: error instanceof Error ? error.message : "Could not work out the estimate.",
          }),
      );
    }, TYPING_PAUSE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [currency, value, key]);

  const shown = outcome?.key === key ? outcome : null;
  return {
    estimate: shown && "estimate" in shown ? shown.estimate : null,
    failure: shown && "message" in shown ? shown.message : null,
  };
}

interface InvoiceSummaryCardProps {
  totals: InvoiceTotals | null;
}

export function InvoiceSummaryCard({ totals }: InvoiceSummaryCardProps) {
  const { estimate, failure } = usePayoutEstimate(totals?.total ?? null);

  return (
    <section aria-labelledby="summary-title" className="rounded-xl border border-line bg-white p-6">
      <h2 id="summary-title" className="text-xl font-semibold">
        Summary
      </h2>

      {!totals ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Add a quantity and a unit price to every item to see the total.
        </p>
      ) : (
        <dl className="mt-3 divide-y divide-line text-sm">
          <Row label="Subtotal" value={formatMoney(totals.subtotal)} />
          {totals.discount && (
            <Row label="Early-payment discount" value={`− ${formatMoney(totals.discount)}`} />
          )}
          <div className="py-3">
            <dt className="text-muted-foreground">Invoice total</dt>
            <dd className="mt-1 font-heading text-3xl font-semibold text-navy tabular-nums">
              {formatMoney(totals.total)}
            </dd>
          </div>
        </dl>
      )}

      <div aria-live="polite" className="mt-2 min-h-16 border-t border-line pt-3 text-sm">
        {failure && <p className="text-late">{failure}</p>}
        {totals && !failure && !estimate && (
          <p className="text-muted-foreground">Working out what reaches your bank…</p>
        )}
        {totals && estimate && (
          <>
            <p className="font-medium tabular-nums">
              About {formatRupees(estimate.netInr)} reaches your bank
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Estimate after PayPal&apos;s fee and conversion. Your real figures appear on the paid
              invoice.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

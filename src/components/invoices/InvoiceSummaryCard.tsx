"use client";

import type { InvoiceTotals } from "@/components/invoices/invoice-form";
import { FactRow } from "@/components/shared/FactRow";
import { usePayoutEstimate } from "@/components/shared/use-payout-estimate";
import { formatMoney, formatRupees } from "@/lib/money/format";

interface InvoiceSummaryCardProps {
  totals: InvoiceTotals | null;
}

export function InvoiceSummaryCard({ totals }: InvoiceSummaryCardProps) {
  const { estimate, failure } = usePayoutEstimate(totals?.total ?? null);

  return (
    <section aria-labelledby="summary-title" className="rounded-xl border border-line bg-card p-6">
      <h2 id="summary-title" className="text-xl font-semibold">
        Summary
      </h2>

      {!totals ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Add a quantity and a unit price to every item to see the total.
        </p>
      ) : (
        <dl className="mt-3 divide-y divide-line text-sm">
          <FactRow label="Subtotal" value={formatMoney(totals.subtotal)} />
          {totals.discount && (
            <FactRow label="Early-payment discount" value={`− ${formatMoney(totals.discount)}`} />
          )}
          <div className="py-3">
            <dt className="text-muted-foreground">Invoice total</dt>
            <dd className="mt-1 font-heading text-3xl font-semibold text-foreground tabular-nums">
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
            <dl className="divide-y divide-line">
              <FactRow label="PayPal fee" value={`− ${formatMoney(estimate.fee)}`} />
              <FactRow
                label="Conversion loss"
                value={`− ${formatRupees(estimate.lossInr)} (${estimate.lossPercent}%)`}
              />
            </dl>
            <p className="mt-2 font-medium tabular-nums">
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

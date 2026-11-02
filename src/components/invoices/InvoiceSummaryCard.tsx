"use client";

import type { InvoiceTotals } from "@/components/invoices/invoice-form";
import { usePayoutEstimate } from "@/components/shared/use-payout-estimate";
import { Button } from "@/components/ui/button";
import { formatMoney, formatRupees } from "@/lib/money/format";

interface InvoiceSummaryCardProps {
  totals: InvoiceTotals | null;
  // Creating and sending is under way.
  pending: boolean;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

export function InvoiceSummaryCard({ totals, pending }: InvoiceSummaryCardProps) {
  const { estimate, failure } = usePayoutEstimate(totals?.total ?? null);

  return (
    <section
      aria-labelledby="summary-title"
      className="grid gap-2.5 surface p-[26px] [--h2-size:24px] [--surface-radius:24px]"
    >
      <h2 id="summary-title" className="mb-1.5">
        Summary
      </h2>

      {!totals ? (
        <p className="text-sm text-muted-foreground">
          Add a quantity and a unit price to every item to see the total.
        </p>
      ) : (
        <dl className="grid gap-2.5 text-base">
          <Line label="Subtotal" value={formatMoney(totals.subtotal)} />
          {totals.discount && (
            <Line label="Early-payment discount" value={`− ${formatMoney(totals.discount)}`} />
          )}
          <div className="flex items-baseline justify-between gap-4 border-y border-line py-3">
            <dt className="font-bold">Invoice total</dt>
            <dd className="font-heading text-[34px] font-extrabold tabular-nums">
              {formatMoney(totals.total)}
            </dd>
          </div>
        </dl>
      )}

      <div aria-live="polite" className="grid gap-2.5 text-[15px]">
        {failure && <p className="text-late">{failure}</p>}
        {totals && !failure && !estimate && (
          <p className="text-muted-foreground">Working out what reaches your bank…</p>
        )}
        {totals && estimate && (
          <>
            <dl className="grid gap-2.5 text-muted-foreground">
              <Line label="PayPal fee" value={`− ${formatMoney(estimate.fee)}`} />
              <Line
                label="Conversion loss"
                value={`− ${formatRupees(estimate.lossInr)} (${estimate.lossPercent}%)`}
              />
            </dl>
            <p className="rounded-[18px] bg-tint-blue px-[18px] py-4">
              <span className="block text-sm font-semibold text-blue">
                About this reaches your bank
              </span>
              <span className="block font-heading text-[32px] font-extrabold text-blue tabular-nums">
                {formatRupees(estimate.netInr)}
              </span>
            </p>
            <p className="text-[13px] text-subtle">
              Estimate after PayPal&apos;s fee and conversion. Your real figures appear on the paid
              invoice.
            </p>
          </>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="mt-1.5 h-14 text-[17px] font-bold"
      >
        {pending ? "Creating and sending…" : "Create and send invoice"}
      </Button>
    </section>
  );
}

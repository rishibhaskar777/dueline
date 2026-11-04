"use client";

import { splitPayoutNote, type DepositPlan } from "@/components/invoices/deposit-plan";
import type { InvoiceTotals } from "@/components/invoices/invoice-form";
import { usePayoutEstimate } from "@/components/shared/use-payout-estimate";
import { costLines } from "@/components/settings/payout-lines";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format-date";
import { formatMoney, formatRupees } from "@/lib/money/format";
import type { Money } from "@/types";
import { cn } from "@/lib/utils";

interface InvoiceSummaryCardProps {
  totals: InvoiceTotals | null;
  // Creating and sending is under way.
  pending: boolean;
  // Set while part of the invoice is asked for upfront: two invoices are made instead of one.
  plan: DepositPlan | null;
}

function Line({ label, value, total }: { label: string; value: string; total?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-wrap justify-between gap-x-4",
        total && "border-t border-line pt-2.5 font-semibold",
      )}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function PlanBlock({
  title,
  amount,
  dueOn,
  outcome: { estimate, failure },
}: {
  title: string;
  amount: Money;
  dueOn: string;
  outcome: ReturnType<typeof usePayoutEstimate>;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-1 rounded-[18px] border border-line px-[18px] py-3.5">
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="font-heading text-[26px] font-extrabold tabular-nums">{formatMoney(amount)}</p>
      <p className="text-sm text-muted-foreground">Due {formatDate(dueOn)}</p>
      <p aria-live="polite" className="text-sm text-blue">
        {estimate
          ? `About ${formatRupees(estimate.netInr)} reaches your bank`
          : (failure ?? "Working out what reaches your bank…")}
      </p>
    </div>
  );
}

export function InvoiceSummaryCard({ totals, pending, plan }: InvoiceSummaryCardProps) {
  const { estimate, failure } = usePayoutEstimate(totals?.total ?? null);
  const deposit = usePayoutEstimate(plan?.deposit ?? null);
  const balance = usePayoutEstimate(plan?.balance ?? null);
  const note = plan ? splitPayoutNote(deposit.estimate, balance.estimate, estimate) : null;

  return (
    <section
      aria-labelledby="summary-title"
      className="grid grid-cols-[minmax(0,1fr)] gap-2.5 surface p-[26px] [--h2-size:24px] [--surface-radius:24px]"
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
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-y border-line py-3">
            <dt className="font-bold">Invoice total</dt>
            <dd className="font-heading text-[34px] font-extrabold tabular-nums break-all">
              {formatMoney(totals.total)}
            </dd>
          </div>
        </dl>
      )}

      {plan && (
        <div className="grid min-w-0 gap-2.5">
          <PlanBlock
            title="Deposit, sent now"
            amount={plan.deposit}
            dueOn={plan.depositDueOn}
            outcome={deposit}
          />
          <PlanBlock
            title="Balance, sent on delivery"
            amount={plan.balance}
            dueOn={plan.balanceDueOn}
            outcome={balance}
          />
          {note && (
            <p role="status" className="text-[13px] text-subtle">
              Together about {formatRupees(note.combinedInr)} reaches your bank.
              {note.extraFeeInr > 0 &&
                ` Two invoices pay PayPal's fixed fee twice, which costs about ${formatRupees(note.extraFeeInr)} more than one invoice.`}
            </p>
          )}
        </div>
      )}

      <div aria-live="polite" className="grid min-w-0 gap-2.5 text-[15px]">
        {failure && <p className="text-late">{failure}</p>}
        {!plan && totals && !failure && !estimate && (
          <p className="text-muted-foreground">Working out what reaches your bank…</p>
        )}
        {!plan && totals && estimate && (
          <>
            <dl className="grid gap-2.5 text-muted-foreground">
              {costLines(estimate).map((line, index, lines) => (
                <Line key={line.label} {...line} total={index === lines.length - 1} />
              ))}
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

      <div className="sticky bottom-0 mt-1.5 max-lg:static">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-auto min-h-14 w-full py-2 text-[17px] font-bold whitespace-normal"
        >
          {pending
            ? "Creating and sending…"
            : plan
              ? "Create deposit and save balance"
              : "Create and send invoice"}
        </Button>
      </div>
    </section>
  );
}

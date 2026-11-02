import { formatMoney, formatRupees } from "@/lib/money/format";
import type { InvoiceSummary } from "@/types";
import { payoutPanel } from "./payout-panel";

export function AmountCard({ invoice }: { invoice: InvoiceSummary }) {
  const payout = payoutPanel(invoice);
  return (
    <section
      aria-label="Amount"
      className="flex flex-wrap items-center justify-between gap-[18px] surface p-7 [--surface-radius:24px]"
    >
      <p>
        <span className="block text-[15px] font-semibold text-muted-foreground">Amount</span>
        <span className="font-heading text-[40px] font-extrabold tracking-[-1.4px] tabular-nums sm:text-[56px]">
          {formatMoney(invoice.amount)}
        </span>
      </p>
      {payout && (
        <p className="rounded-[18px] bg-tint-blue px-[22px] py-[18px]">
          <span className="block text-sm font-semibold text-blue">{payout.label}</span>
          <span className="block font-heading text-[32px] font-extrabold text-blue tabular-nums">
            {formatRupees(payout.rupees)}
          </span>
          <span className="block text-[13px] text-muted-foreground">{payout.note}</span>
        </p>
      )}
    </section>
  );
}

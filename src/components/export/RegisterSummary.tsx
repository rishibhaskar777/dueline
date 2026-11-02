import { TotalCard } from "@/components/shared/TotalCard";
import { formatMonthName } from "@/lib/format-date";
import { formatMoney, formatRupees } from "@/lib/money/format";
import type { ExportRegister } from "@/types";
import { describeRupees } from "./register-text";
import { bankNote, invoicesPaid, paypalFiraNote } from "./register-totals";

export function RegisterSummary({ register }: { register: ExportRegister }) {
  const { missingPurposeCodes, totalsByCurrency } = register;

  return (
    <>
      <dl
        aria-label="Summary"
        className="grid gap-4 max-sm:grid-cols-1 max-lg:grid-cols-2 lg:grid-cols-4"
      >
        <TotalCard
          label="Invoices paid"
          value={String(invoicesPaid(register))}
          note={`${formatMonthName(register.month, false)}, India time`}
        />
        <TotalCard
          label="Rupees received"
          value={formatRupees(register.totalInr)}
          note={describeRupees(register)}
          tone="navy"
        />
        <TotalCard
          label="On PayPal's FIRA"
          value={formatRupees(register.paypalFiraInr)}
          note={paypalFiraNote(register)}
        />
        <TotalCard
          label="By bank transfer"
          value={formatRupees(register.bankInr)}
          note={bankNote(register)}
        />
      </dl>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <p>
          Foreign totals, before PayPal&apos;s fee:{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {totalsByCurrency.map((total) => formatMoney(total)).join(" · ")}
          </span>
        </p>
        {missingPurposeCodes > 0 && (
          <p className="rounded-full bg-tint-amber px-3.5 py-1.5 font-semibold text-due-soon">
            {missingPurposeCodes} without a purpose code. Ask your CA which code to use.
          </p>
        )}
      </div>
    </>
  );
}

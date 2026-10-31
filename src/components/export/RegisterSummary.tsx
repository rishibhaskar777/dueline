import { StatTile } from "@/components/shared/StatTile";
import { formatMonth } from "@/lib/format-date";
import { formatMoney, formatRupees } from "@/lib/money/format";
import type { ExportRegister } from "@/types";
import { describeRupeeSplit } from "./register-text";

export function RegisterSummary({ register }: { register: ExportRegister }) {
  const { rows, missingPurposeCodes } = register;

  return (
    <dl aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label="Invoices paid"
        value={rows.length}
        note={`In ${formatMonth(register.month)}, India time`}
      />
      <StatTile
        label="Rupees received"
        value={formatRupees(register.totalInr)}
        note={describeRupeeSplit(register)}
      />
      <StatTile
        label="Foreign totals"
        compact
        value={register.totalsByCurrency.map((total) => (
          <span key={total.currency} className="block">
            {formatMoney(total)}
          </span>
        ))}
        note="Invoice amounts before PayPal's fee"
      />
      {missingPurposeCodes > 0 && (
        <StatTile
          label="Purpose codes missing"
          value={missingPurposeCodes}
          note="Ask your CA which code to use"
          tone="due-soon"
        />
      )}
    </dl>
  );
}

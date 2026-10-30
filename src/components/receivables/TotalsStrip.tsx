import { formatRupees } from "@/lib/money/format";
import { cn } from "@/lib/utils";
import type { Totals } from "@/types";

interface TileProps {
  label: string;
  value: number;
  note: string;
  late?: boolean;
}

function Tile({ label, value, note, late = false }: TileProps) {
  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn("mt-1 font-heading text-4xl font-semibold text-navy tabular-nums", {
          "text-late": late,
        })}
      >
        {formatRupees(value)}
      </dd>
      <dd className="mt-1 text-sm text-muted-foreground">{note}</dd>
    </div>
  );
}

export function TotalsStrip({ totals }: { totals: Totals }) {
  const overdueNote = totals.overdueCount === 1 ? "1 invoice" : `${totals.overdueCount} invoices`;

  return (
    <dl aria-label="Totals" className="grid gap-4 sm:grid-cols-3">
      <Tile label="Outstanding" value={totals.outstandingInr} note="Estimated after fees" />
      <Tile label="Overdue" value={totals.overdueInr} note={overdueNote} late />
      <Tile
        label="Paid this month"
        value={totals.paidThisMonthInr}
        note="Rupees from paid invoices"
      />
    </dl>
  );
}

import { formatMonth } from "@/lib/format-date";
import { fromMinorUnits, toMinorUnits } from "@/lib/money/decimal";
import { formatMoney, formatRupees } from "@/lib/money/format";
import type { ExportOutsideRow, ExportRegisterRow, Money } from "@/types";

// What the pinned last row of an export grid shows, worked out from the same rows the grid lists.
export interface GridTotals {
  label: string;
  payments: string;
  rupees: number;
  // One money per currency, in the order the currencies first appear. Empty when a grid has no
  // such column.
  amount: Money[];
  fee: Money[];
  net: Money[];
}

function sumByCurrency(values: (Money | null)[]): Money[] {
  const minor = new Map<Money["currency"], number>();
  for (const money of values) {
    if (money)
      minor.set(money.currency, (minor.get(money.currency) ?? 0) + toMinorUnits(money.value));
  }
  return [...minor].map(([currency, total]) => ({ currency, value: fromMinorUnits(total) }));
}

function summary(rows: { inrReceived: number }[], month: string) {
  return {
    label: `Total for ${formatMonth(month)}`,
    payments: `${rows.length} ${rows.length === 1 ? "payment" : "payments"}`,
    rupees: rows.reduce((sum, row) => sum + row.inrReceived, 0),
  };
}

export function paypalGridTotals(rows: ExportRegisterRow[], month: string): GridTotals {
  return {
    ...summary(rows, month),
    amount: sumByCurrency(rows.map((row) => row.foreign)),
    fee: sumByCurrency(rows.map((row) => row.fee)),
    net: sumByCurrency(rows.map((row) => row.net)),
  };
}

export function bankGridTotals(rows: ExportOutsideRow[], month: string): GridTotals {
  return { ...summary(rows, month), amount: [], fee: [], net: [] };
}

// The lines of the totals row under the column with this header; empty when the row says nothing
// there.
export function totalsLines(totals: GridTotals, header: string): string[] {
  switch (header) {
    case "Paid on":
      return [totals.label, totals.payments];
    case "Amount":
      return totals.amount.map(formatMoney);
    case "Rupees":
      return [formatRupees(totals.rupees)];
    case "Fee":
      return totals.fee.length > 0 ? totals.fee.map(formatMoney) : ["–"];
    case "Net":
      return totals.net.length > 0 ? totals.net.map(formatMoney) : ["–"];
    default:
      return [];
  }
}

const LINE_HEIGHT = 22;
const ROW_PADDING = 20;

// The totals row is as tall as its longest column: the label's two lines, or one line for each
// currency.
export function totalsRowHeight(totals: GridTotals): number {
  const lines = Math.max(2, totals.amount.length, totals.fee.length, totals.net.length);
  return lines * LINE_HEIGHT + ROW_PADDING;
}

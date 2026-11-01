import { addDays, daysBetween } from "@/lib/date-math";
import type { InvoiceSummary, PaySpeed } from "@/types";

const WINDOW_DAYS = 365;

// How long clients take, over the invoices paid in the last 12 months: the mean days from issue date
// to paid date, and the share paid on or before the due date. Null when nothing was paid.
export function computePaySpeed(
  invoices: readonly InvoiceSummary[],
  today: string,
): PaySpeed | null {
  const since = addDays(today, -WINDOW_DAYS);
  const paid = invoices.flatMap((invoice) =>
    invoice.dueState === "paid" && invoice.paidOn !== null && invoice.paidOn >= since
      ? [{ invoice, paidOn: invoice.paidOn }]
      : [],
  );
  if (paid.length === 0) return null;

  const days = paid.map(({ invoice, paidOn }) =>
    Math.max(0, daysBetween(invoice.issuedOn, paidOn)),
  );
  const onTime = paid.filter(({ invoice, paidOn }) => paidOn <= invoice.dueOn).length;
  return {
    averageDays: Math.round((days.reduce((sum, d) => sum + d, 0) / paid.length) * 10) / 10,
    onTimePercent: Math.round((onTime / paid.length) * 100),
    invoices: paid.length,
  };
}

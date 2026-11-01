import { addDays } from "@/lib/date-math";
import type { InvoiceSummary, Totals } from "@/types";

// The last 30 days count today and the 29 before it.
const RECENT_DAYS = 30;

function sumInPaise(invoices: InvoiceSummary[]): number {
  const paise = invoices.reduce(
    (sum, invoice) => sum + Math.round((invoice.payoutInr ?? 0) * 100),
    0,
  );
  return paise / 100;
}

export function computeTotals(invoices: InvoiceSummary[], today: string): Totals {
  const withRupees = invoices.filter((invoice) => invoice.payoutInr !== null);
  const unpaid = withRupees.filter((invoice) => invoice.dueState !== "paid");
  const overdue = unpaid.filter((invoice) => invoice.dueState === "overdue");
  const since = addDays(today, 1 - RECENT_DAYS);
  const paidRecently = withRupees.filter(
    ({ dueState, paidOn }) =>
      dueState === "paid" && paidOn !== null && paidOn >= since && paidOn <= today,
  );
  const outside = paidRecently.filter((invoice) => invoice.payoutSource === "outside_paypal");
  const viaPayPal = paidRecently.filter((invoice) => invoice.payoutSource !== "outside_paypal");

  return {
    outstandingInr: sumInPaise(unpaid),
    overdueInr: sumInPaise(overdue),
    overdueCount: invoices.filter((invoice) => invoice.dueState === "overdue").length,
    paidLast30Inr: sumInPaise(paidRecently),
    paidLast30PayPalInr: sumInPaise(viaPayPal),
    paidLast30OutsideInr: sumInPaise(outside),
  };
}

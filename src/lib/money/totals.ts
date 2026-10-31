import type { InvoiceSummary, Totals } from "@/types";

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
  const paidThisMonth = withRupees.filter(
    (invoice) => invoice.dueState === "paid" && invoice.paidOn?.slice(0, 7) === today.slice(0, 7),
  );
  const outside = paidThisMonth.filter((invoice) => invoice.payoutSource === "outside_paypal");
  const viaPayPal = paidThisMonth.filter((invoice) => invoice.payoutSource !== "outside_paypal");

  return {
    outstandingInr: sumInPaise(unpaid),
    overdueInr: sumInPaise(overdue),
    overdueCount: invoices.filter((invoice) => invoice.dueState === "overdue").length,
    paidThisMonthPayPalInr: sumInPaise(viaPayPal),
    paidThisMonthOutsideInr: sumInPaise(outside),
  };
}

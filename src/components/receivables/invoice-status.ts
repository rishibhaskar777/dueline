import { formatDate } from "@/lib/format-date";
import type { DueState, InvoiceSummary, PayoutSource } from "@/types";

const LABELS: Record<DueState, string> = {
  paid: "Paid",
  on_time: "On time",
  due_soon: "Due soon",
  overdue: "Overdue",
};

const SOURCE_NOTES: Record<PayoutSource, string> = {
  paypal: "PayPal",
  estimate: "estimate",
  outside_paypal: "outside PayPal",
};

export function payoutSourceNote(source: PayoutSource): string {
  return SOURCE_NOTES[source];
}

export function isPaidOutsidePayPal(invoice: InvoiceSummary): boolean {
  return invoice.payoutSource === "outside_paypal";
}

// Shows which day's ECB rate stands behind a rupee figure that was worked out.
export function rateNote(invoice: InvoiceSummary): string | null {
  return invoice.rateDate ? `ECB rate of ${formatDate(invoice.rateDate)}` : null;
}

// "Due today" and "Paid outside PayPal" are not DueStates of their own, so the table, the panel and
// the due line all read them from here.
export function statusLabel(invoice: InvoiceSummary, today: string): string {
  if (isPaidOutsidePayPal(invoice)) return "Paid outside PayPal";
  if (invoice.dueState !== "paid" && invoice.dueOn === today) return "Due today";
  return LABELS[invoice.dueState];
}

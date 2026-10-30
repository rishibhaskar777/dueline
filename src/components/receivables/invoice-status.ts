import type { DueState, InvoiceSummary } from "@/types";

const LABELS: Record<DueState, string> = {
  paid: "Paid",
  on_time: "On time",
  due_soon: "Due soon",
  overdue: "Overdue",
};

// PayPal reports the rupees only when it converted the money. Otherwise they are worked out
// from PayPal's net at the ECB rate, so they are an estimate.
export function rupeesFromPayPal(invoice: InvoiceSummary): boolean {
  return (invoice.actualPayout?.netInr ?? null) !== null;
}

// "Due today" is not a DueState of its own, so the table, the panel and the due line all
// read it from here.
export function statusLabel(invoice: InvoiceSummary, today: string): string {
  if (invoice.dueState !== "paid" && invoice.dueOn === today) return "Due today";
  return LABELS[invoice.dueState];
}

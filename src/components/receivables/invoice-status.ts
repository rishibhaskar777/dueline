import type { DueState, InvoiceSummary } from "@/types";

const LABELS: Record<DueState, string> = {
  paid: "Paid",
  on_time: "On time",
  due_soon: "Due soon",
  overdue: "Overdue",
};

// "Due today" is not a DueState of its own, so the table, the panel and the due line all
// read it from here.
export function statusLabel(invoice: InvoiceSummary, today: string): string {
  if (invoice.dueState !== "paid" && invoice.dueOn === today) return "Due today";
  return LABELS[invoice.dueState];
}

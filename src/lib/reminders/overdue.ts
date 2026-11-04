import { daysBetween } from "@/lib/date-math";
import type { InvoiceSummary, Tone } from "@/types";
import { InvalidReminderError } from "./errors";

// PayPal sends reminders only for invoices that are sent and still owe something.
const REMINDABLE_STATUSES = ["SENT", "UNPAID", "PARTIALLY_PAID"];

export function isRemindable(invoice: InvoiceSummary): boolean {
  return REMINDABLE_STATUSES.includes(invoice.paypalStatus) && invoice.dueState === "overdue";
}

// A heads-up is for an invoice that is waiting for its due date: sent, unpaid and not late yet.
export function isNotYetDue(invoice: InvoiceSummary): boolean {
  return (
    REMINDABLE_STATUSES.includes(invoice.paypalStatus) &&
    (invoice.dueState === "on_time" || invoice.dueState === "due_soon")
  );
}

// Whole days from today to the due date; 0 on the due date itself.
export function daysUntilDue(invoice: InvoiceSummary, today: string): number {
  return daysBetween(today, invoice.dueOn);
}

export function assertRemindable(invoice: InvoiceSummary, tone: Tone): void {
  if (invoice.dueState === "paid") throw new InvalidReminderError("This invoice is already paid.");
  if (!REMINDABLE_STATUSES.includes(invoice.paypalStatus)) {
    throw new InvalidReminderError(
      "PayPal can only send a reminder for an invoice that is sent and unpaid.",
    );
  }
  if (tone === "heads_up") {
    if (invoice.dueState === "overdue") {
      throw new InvalidReminderError("This invoice is already late. Send a reminder instead.");
    }
    return;
  }
  if (invoice.dueState !== "overdue")
    throw new InvalidReminderError("This invoice is not overdue.");
}

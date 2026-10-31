import type { InvoiceSummary } from "@/types";
import { InvalidReminderError } from "./errors";

// PayPal sends reminders only for invoices that are sent and still owe something.
const REMINDABLE_STATUSES = ["SENT", "UNPAID", "PARTIALLY_PAID"];

export function isRemindable(invoice: InvoiceSummary): boolean {
  return REMINDABLE_STATUSES.includes(invoice.paypalStatus) && invoice.dueState === "overdue";
}

export function assertRemindable(invoice: InvoiceSummary): void {
  if (invoice.dueState === "paid") throw new InvalidReminderError("This invoice is already paid.");
  if (!REMINDABLE_STATUSES.includes(invoice.paypalStatus)) {
    throw new InvalidReminderError(
      "PayPal can only send a reminder for an invoice that is sent and unpaid.",
    );
  }
  if (invoice.dueState !== "overdue")
    throw new InvalidReminderError("This invoice is not overdue.");
}

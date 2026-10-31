import { daysBetween } from "@/lib/date-math";
import { isRemindable } from "@/lib/reminders/overdue";
import type { InvoiceDetails, InvoiceSummary, RecordPaymentRequest } from "@/types";
import { InvalidActionError, InvoiceStateError } from "./errors";

// PayPal cancels a sent invoice nobody has paid for, and takes a payment recorded against any sent
// invoice that still owes something.
const CANCELLABLE = ["SENT", "UNPAID"];
const RECORDABLE = ["SENT", "UNPAID", "PARTIALLY_PAID"];

export function availableActions(invoice: InvoiceSummary): InvoiceDetails["actions"] {
  return {
    remind: isRemindable(invoice),
    recordPayment: RECORDABLE.includes(invoice.paypalStatus),
    cancel: CANCELLABLE.includes(invoice.paypalStatus),
  };
}

function describeStatus(status: string): string {
  if (status === "PAID" || status === "MARKED_AS_PAID") return "is already paid";
  if (status === "CANCELLED") return "is already cancelled";
  if (status === "DRAFT") return "has not been sent yet";
  return "cannot be changed in its current state";
}

export function assertCancellable(invoice: InvoiceSummary): void {
  if (!CANCELLABLE.includes(invoice.paypalStatus)) {
    throw new InvoiceStateError(`This invoice ${describeStatus(invoice.paypalStatus)}.`);
  }
}

export function assertCanRecordPayment(
  invoice: InvoiceSummary,
  { paidOn }: Pick<RecordPaymentRequest, "paidOn">,
  today: string,
): void {
  if (!RECORDABLE.includes(invoice.paypalStatus)) {
    throw new InvoiceStateError(`This invoice ${describeStatus(invoice.paypalStatus)}.`);
  }
  if (paidOn > today) throw new InvalidActionError("The payment date cannot be in the future.");
  if (daysBetween(invoice.issuedOn, paidOn) < 0) {
    throw new InvalidActionError("The payment date cannot be before the invoice date.");
  }
}

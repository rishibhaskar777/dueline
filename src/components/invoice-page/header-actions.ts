import type { InvoiceDetailResponse } from "@/types";

export interface HeaderActions {
  openPayerLink: boolean;
  viewOnPayPal: boolean;
  copyPayerLink: boolean;
  sendReminder: boolean;
}

// The buttons beside the invoice's title. A cancelled invoice cannot be paid, so it has no link; a
// paid one has nothing left to pay, so its link only lets you view it on PayPal. The server says
// whether a reminder still makes sense.
export function headerActions({
  invoice,
  details,
}: Pick<InvoiceDetailResponse, "invoice" | "details">): HeaderActions {
  const linked = Boolean(invoice.payLink) && invoice.paypalStatus !== "CANCELLED";
  const paid = invoice.dueState === "paid";
  return {
    openPayerLink: linked && !paid,
    viewOnPayPal: linked && paid,
    copyPayerLink: linked && !paid,
    sendReminder: details.actions.remind,
  };
}

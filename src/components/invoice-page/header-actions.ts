import type { InvoiceDetailResponse } from "@/types";

export interface HeaderActions {
  openPayerLink: boolean;
  copyPayerLink: boolean;
  sendReminder: boolean;
}

// The buttons beside the invoice's title. A cancelled invoice cannot be paid, and the server says
// whether a reminder still makes sense, so a paid or cancelled invoice shows no reminder.
export function headerActions({
  invoice,
  details,
}: Pick<InvoiceDetailResponse, "invoice" | "details">): HeaderActions {
  const payable = Boolean(invoice.payLink) && invoice.paypalStatus !== "CANCELLED";
  return {
    openPayerLink: payable,
    copyPayerLink: payable,
    sendReminder: details.actions.remind,
  };
}

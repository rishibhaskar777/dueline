import { addDays, daysBetween } from "@/lib/date-math";
import { splitOf } from "./memo";
import type { PayPalInvoice, PayPalInvoiceUpdate } from "./types";

// Only a balance invoice waits as a draft for weeks, so only it is dated again when it goes out.
export function needsRedating(invoice: PayPalInvoice): boolean {
  return invoice.status === "DRAFT" && splitOf(invoice.detail.memo)?.role === "balance";
}

// The saved invoice with its invoice date moved to the sending day and its due date moved with it,
// so the client gets the same number of days to pay as the freelancer chose.
export function redatedForSending(invoice: PayPalInvoice, sendOn: string): PayPalInvoiceUpdate {
  const { detail } = invoice;
  const term = detail.payment_term;
  const daysToPay = term?.due_date ? daysBetween(detail.invoice_date, term.due_date) : null;

  return {
    detail: {
      invoice_number: detail.invoice_number,
      ...(detail.reference ? { reference: detail.reference } : {}),
      invoice_date: sendOn,
      currency_code: detail.currency_code,
      ...(detail.note ? { note: detail.note } : {}),
      ...(detail.memo ? { memo: detail.memo } : {}),
      payment_term: {
        term_type: term?.term_type ?? "DUE_ON_DATE_SPECIFIED",
        ...(daysToPay === null ? {} : { due_date: addDays(sendOn, Math.max(daysToPay, 0)) }),
      },
    },
    ...(invoice.invoicer ? { invoicer: invoice.invoicer } : {}),
    primary_recipients: invoice.primary_recipients ?? [],
    items: invoice.items ?? [],
  };
}

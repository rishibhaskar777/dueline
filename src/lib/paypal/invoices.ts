import "server-only";
import type { PaymentMethod } from "@/types";
import { paypalFetch } from "./rest";
import type { PayPalInvoice, PayPalInvoiceInput, PayPalInvoiceList } from "./types";

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

export async function nextInvoiceNumber(): Promise<string> {
  const result = await paypalFetch<{ invoice_number: string }>(
    "/v2/invoicing/generate-next-invoice-number",
    { method: "POST" },
  );
  return result.invoice_number;
}

export function createDraftInvoice(
  body: PayPalInvoiceInput,
  requestId: string,
): Promise<PayPalInvoice> {
  return paypalFetch<PayPalInvoice>("/v2/invoicing/invoices", {
    method: "POST",
    body,
    requestId,
    headers: { Prefer: "return=representation" },
  });
}

// PayPal ignores a subject and note on this call and writes its own email, so none is sent. What the
// client reads on the invoice itself (its note, terms, items) is part of the invoice.
export async function sendInvoice(id: string, requestId: string): Promise<void> {
  await paypalFetch<void>(`/v2/invoicing/invoices/${encodeURIComponent(id)}/send`, {
    method: "POST",
    requestId,
    body: { send_to_invoicer: false, send_to_recipient: true },
  });
}

// PayPal emails its standard reminder with a Pay now button; a subject or note given here is not
// honored, so none is sent.
export async function remindInvoice(id: string): Promise<void> {
  await paypalFetch<void>(`/v2/invoicing/invoices/${encodeURIComponent(id)}/remind`, {
    method: "POST",
    body: { send_to_invoicer: false, send_to_recipient: true },
  });
}

// Cancels a sent invoice. The client is emailed only when asked.
export async function cancelInvoice(
  id: string,
  { notifyClient = false }: { notifyClient?: boolean } = {},
): Promise<void> {
  await paypalFetch<void>(`/v2/invoicing/invoices/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    body: { send_to_invoicer: false, send_to_recipient: notifyClient },
  });
}

export async function deleteDraftInvoice(id: string): Promise<void> {
  await paypalFetch<void>(`/v2/invoicing/invoices/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// Records a payment made outside PayPal. The invoice becomes MARKED_AS_PAID.
export async function recordExternalPayment(
  id: string,
  payment: { paymentDate: string; note: string; method?: PaymentMethod },
): Promise<void> {
  await paypalFetch<{ payment_id: string }>(
    `/v2/invoicing/invoices/${encodeURIComponent(id)}/payments`,
    {
      method: "POST",
      body: {
        method: payment.method ?? "BANK_TRANSFER",
        type: "EXTERNAL",
        payment_date: payment.paymentDate,
        note: payment.note,
      },
    },
  );
}

export function getInvoice(id: string): Promise<PayPalInvoice> {
  return paypalFetch<PayPalInvoice>(`/v2/invoicing/invoices/${encodeURIComponent(id)}`);
}

export async function listInvoices(): Promise<PayPalInvoice[]> {
  const invoices: PayPalInvoice[] = [];
  let totalPages = 1;
  for (let page = 1; page <= Math.min(totalPages, MAX_PAGES); page++) {
    const result = await paypalFetch<PayPalInvoiceList>(
      `/v2/invoicing/invoices?page=${page}&page_size=${PAGE_SIZE}&total_required=true`,
    );
    invoices.push(...(result.items ?? []));
    totalPages = result.total_pages ?? 1;
  }
  return invoices;
}

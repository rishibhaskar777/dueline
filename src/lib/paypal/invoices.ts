import "server-only";
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

export async function sendInvoice(
  id: string,
  message: { subject: string; note: string },
  requestId: string,
): Promise<void> {
  await paypalFetch<void>(`/v2/invoicing/invoices/${encodeURIComponent(id)}/send`, {
    method: "POST",
    requestId,
    body: { send_to_invoicer: false, send_to_recipient: true, ...message },
  });
}

export async function remindInvoice(
  id: string,
  message: { subject: string; note: string },
): Promise<void> {
  await paypalFetch<void>(`/v2/invoicing/invoices/${encodeURIComponent(id)}/remind`, {
    method: "POST",
    body: { send_to_invoicer: false, send_to_recipient: true, ...message },
  });
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

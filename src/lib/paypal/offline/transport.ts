import "server-only";
import { PayPalApiError } from "@/lib/paypal/errors";
import type { PayPalInvoiceInput, PayPalInvoiceList } from "@/lib/paypal/types";
import type { ActualPayout } from "@/types";
import type { FakePayPal } from "./fake-paypal";
import { offlinePayPal } from "./world";

interface OfflineRequest {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  rawBody?: string;
}

// The signature a webhook must carry for the fake to accept it. Real signatures cannot be checked
// without PayPal, so tests and curl use this one.
export const OFFLINE_WEBHOOK_SIGNATURE = "offline-signature";

const INVOICE_PATH = /^\/v2\/invoicing\/invoices\/([^/]+)(?:\/([a-z]+))?$/;

function unknownRoute(method: string, path: string): PayPalApiError {
  return new PayPalApiError({
    status: 404,
    paypalName: "RESOURCE_NOT_FOUND",
    message: `The offline PayPal does not answer ${method} ${path}.`,
  });
}

function verifyWebhook(rawBody: string | undefined): { verification_status: string } {
  const { transmission_sig } = JSON.parse(rawBody ?? "{}") as { transmission_sig?: string };
  return {
    verification_status: transmission_sig === OFFLINE_WEBHOOK_SIGNATURE ? "SUCCESS" : "FAILURE",
  };
}

async function listInvoices(fake: FakePayPal): Promise<PayPalInvoiceList> {
  const items = await fake.listInvoicesInFull();
  return { items, total_items: items.length, total_pages: 1 };
}

async function recordPayment(fake: FakePayPal, id: string, body: unknown): Promise<unknown> {
  const { payment_date } = body as { payment_date: string };
  await fake.recordExternalPayment(id, { paymentDate: payment_date });
  return { payment_id: `OFFLINE-PAYMENT-${id}` };
}

async function route(fake: FakePayPal, path: string, request: OfflineRequest): Promise<unknown> {
  const method = request.method ?? "GET";
  const [pathname] = path.split("?");

  if (method === "POST" && pathname === "/v2/invoicing/generate-next-invoice-number") {
    return { invoice_number: await fake.nextInvoiceNumber() };
  }
  if (method === "POST" && pathname === "/v1/notifications/verify-webhook-signature") {
    return verifyWebhook(request.rawBody);
  }
  if (pathname === "/v2/invoicing/invoices") {
    if (method === "POST") return fake.createDraftInvoice(request.body as PayPalInvoiceInput);
    if (method === "GET") return listInvoices(fake);
  }

  const match = INVOICE_PATH.exec(pathname);
  if (match) {
    const id = decodeURIComponent(match[1]);
    const action = match[2];
    if (!action && method === "GET") return fake.getInvoice(id);
    if (!action && method === "DELETE") return fake.deleteDraftInvoice(id);
    if (method === "POST" && action === "send") return fake.sendInvoice(id);
    if (method === "POST" && action === "remind") return fake.remindInvoice(id);
    if (method === "POST" && action === "cancel") return fake.cancelInvoice(id);
    if (method === "POST" && action === "payments") return recordPayment(fake, id, request.body);
  }
  throw unknownRoute(method, path);
}

// Answers the Invoicing and webhook calls Dueline makes, in place of PayPal's servers.
export async function offlinePayPalFetch<T>(path: string, request: OfflineRequest): Promise<T> {
  return (await route(await offlinePayPal(), path, request)) as T;
}

// PayPal's own figures for a payment, which the real app reads from the Payments API.
export async function offlineCapture(paymentId: string): Promise<ActualPayout | null> {
  return (await offlinePayPal()).captures.get(paymentId) ?? null;
}

import "server-only";
import { today } from "@/lib/clock";
import { InvoiceNotFoundError, InvoiceStateError } from "@/lib/invoices/errors";
import { PayPalApiError } from "@/lib/paypal/errors";
import { getInvoice } from "@/lib/paypal/invoices";
import { refreshSnapshotNow, summarise, type LoadedInvoice } from "@/lib/paypal/summaries";
import { isRemindable } from "@/lib/reminders/overdue";
import { getStore } from "@/lib/store";
import type { StoredPromise } from "@/lib/store/store";
import type { PaymentPromise, PutPromiseRequest } from "@/types";
import { toPromise } from "./attach-promises";
import { InvalidPromiseDateError } from "./errors";
import { isPromiseDateAllowed, PROMISE_RANGE_MESSAGE } from "./promise-range";

async function readOpenInvoice(invoiceId: string) {
  try {
    return summarise(await getInvoice(invoiceId));
  } catch (error) {
    if (error instanceof PayPalApiError && error.status === 404) throw new InvoiceNotFoundError();
    throw error;
  }
}

// The date is checked here as well as in the form, against today in India time.
export async function savePaymentPromise(
  invoiceId: string,
  { promisedOn, note = "" }: PutPromiseRequest,
): Promise<PaymentPromise> {
  const summary = await readOpenInvoice(invoiceId);
  if (!isRemindable(summary)) {
    throw new InvoiceStateError("A promised date can be noted only for a late, unpaid invoice.");
  }
  if (!isPromiseDateAllowed(promisedOn, today()))
    throw new InvalidPromiseDateError(PROMISE_RANGE_MESSAGE);

  const store = getStore();
  const stored: StoredPromise = {
    invoiceId,
    promisedOn,
    note: note.trim(),
    createdAt: new Date().toISOString(),
  };
  await store.savePromise(stored);
  await store.addActivity({
    id: `promise:${invoiceId}:${promisedOn}`,
    kind: "promised",
    invoiceId,
    invoiceNumber: summary.number,
    clientName: summary.client.name,
    at: stored.createdAt,
    detail: promisedOn,
  });
  await refreshSnapshotNow([invoiceId]);
  return toPromise(stored);
}

export async function removePaymentPromise(invoiceId: string): Promise<void> {
  await readOpenInvoice(invoiceId);
  await getStore().deletePromise(invoiceId);
  await refreshSnapshotNow([invoiceId]);
}

// A paid or cancelled invoice has nothing left to promise. Called wherever one is recorded; a
// failure is only logged, because the invoice is already settled and the payment must not fail.
export async function clearPaymentPromise(invoiceId: string): Promise<void> {
  try {
    await getStore().deletePromise(invoiceId);
  } catch {
    console.warn("Clearing a payment promise failed");
  }
}

// The morning run's sweep: a promise whose invoice is paid, or no longer listed (cancelled or
// deleted), is removed, in case the event that should have removed it was missed.
export async function clearSettledPromises(invoices: LoadedInvoice[]): Promise<void> {
  const store = getStore();
  const open = new Set(
    invoices.filter(({ summary }) => summary.dueState !== "paid").map(({ summary }) => summary.id),
  );
  for (const { invoiceId } of await store.listPromises()) {
    if (!open.has(invoiceId)) await store.deletePromise(invoiceId);
  }
}

import { todayInKolkata } from "@/lib/date-math";
import { InvoiceStateError } from "@/lib/invoices/errors";
import type { Store } from "@/lib/store/store";

export const PAYPAL_HEADS_UP_REFUSED =
  "PayPal only sends its reminder once an invoice is due. Use Send my message.";

const ONE_DAY_SECONDS = 24 * 60 * 60;

// The key names the India day, so a refusal stops mattering at midnight there.
const keyOf = (invoiceId: string): string => `heads-up-refused:${invoiceId}:${todayInKolkata()}`;

export async function paypalRefusedHeadsUp(store: Store, invoiceId: string): Promise<boolean> {
  return (await store.getCached(keyOf(invoiceId))) !== null;
}

export async function recordPayPalRefusal(store: Store, invoiceId: string): Promise<void> {
  await store.putCached(keyOf(invoiceId), true, ONE_DAY_SECONDS);
}

export function paypalRefusedError(): InvoiceStateError {
  return new InvoiceStateError(PAYPAL_HEADS_UP_REFUSED);
}

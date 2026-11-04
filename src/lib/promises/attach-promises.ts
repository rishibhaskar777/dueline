import type { LoadedInvoice } from "@/lib/paypal/summaries";
import type { StoredPromise } from "@/lib/store/store";
import type { PaymentPromise } from "@/types";

export const toPromise = ({ promisedOn, note, createdAt }: StoredPromise): PaymentPromise => ({
  promisedOn,
  note,
  createdAt,
});

// Puts each stored promise on its invoice, unless that invoice is paid: a payment ends the promise
// even before the store has been told.
export function withPromises(invoices: LoadedInvoice[], stored: StoredPromise[]): LoadedInvoice[] {
  const byInvoice = new Map(stored.map((promise) => [promise.invoiceId, promise]));
  return invoices.map((loaded) => {
    const promise = byInvoice.get(loaded.summary.id);
    if (!promise || loaded.summary.dueState === "paid") return loaded;
    return { ...loaded, summary: { ...loaded.summary, promise: toPromise(promise) } };
  });
}

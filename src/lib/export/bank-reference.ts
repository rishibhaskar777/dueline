import "server-only";
import { InvoiceNotFoundError, InvoiceStateError } from "@/lib/invoices/errors";
import { PayPalApiError } from "@/lib/paypal/errors";
import { getInvoice } from "@/lib/paypal/invoices";
import { isRecordedOutsidePayPal } from "@/lib/paypal/map";
import { getStore } from "@/lib/store";

// Only a payment recorded outside PayPal has a bank proof; a PayPal payment is proved by its FIRA.
// An empty reference clears the stored one. Returns what is stored afterwards.
export async function saveBankReference(
  invoiceId: string,
  reference: string,
): Promise<string | null> {
  try {
    const invoice = await getInvoice(invoiceId);
    if (!isRecordedOutsidePayPal(invoice.status)) {
      throw new InvoiceStateError(
        "Only a payment recorded outside PayPal has a bank reference. A PayPal payment is on PayPal's FIRA.",
      );
    }
  } catch (error) {
    if (error instanceof PayPalApiError && error.status === 404) throw new InvoiceNotFoundError();
    throw error;
  }
  const stored = reference === "" ? null : reference;
  await getStore().saveBankReference(invoiceId, stored);
  return stored;
}

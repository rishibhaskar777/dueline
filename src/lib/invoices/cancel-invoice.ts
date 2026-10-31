import "server-only";
import { assertSandboxBuyers } from "@/lib/demo-guard";
import { InvoiceNotFoundError } from "@/lib/invoices/errors";
import { PayPalApiError } from "@/lib/paypal/errors";
import { cancelInvoice as cancelAtPayPal, getInvoice } from "@/lib/paypal/invoices";
import { clearInvoiceCaches, recipientsOf, summarise } from "@/lib/paypal/summaries";
import { runClaimed } from "@/lib/requests/run-claimed";
import { getStore } from "@/lib/store";
import type { Json } from "@/lib/store/store";
import type { CancelInvoiceRequest, CancelInvoiceResponse } from "@/types";
import { assertCancellable } from "./invoice-actions";

function fromStored(value: Json): CancelInvoiceResponse {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    if (value.cancelled === true && typeof value.notified === "boolean") {
      return { cancelled: true, notified: value.notified };
    }
  }
  throw new Error("The stored result of this request cannot be read.");
}

async function checkCancellable(id: string, notifyClient: boolean): Promise<void> {
  try {
    const invoice = await getInvoice(id);
    assertCancellable(summarise(invoice));
    if (notifyClient) assertSandboxBuyers(recipientsOf(invoice));
  } catch (error) {
    if (error instanceof PayPalApiError && error.status === 404) throw new InvoiceNotFoundError();
    throw error;
  }
}

// Cancels in PayPal. Nothing is emailed unless the freelancer asks for it, and then the demo guard
// applies as it does to every message that leaves Dueline.
export function cancelInvoice(
  id: string,
  { requestId, notifyClient = false }: CancelInvoiceRequest,
): Promise<CancelInvoiceResponse> {
  return runClaimed(getStore(), {
    requestId,
    body: { id, notifyClient },
    messages: {
      conflict: "This request ID was already used for a different cancellation.",
      inProgress: "This invoice is still being cancelled. Check the invoice page in a moment.",
    },
    readStored: fromStored,
    run: async () => {
      await checkCancellable(id, notifyClient);
      await cancelAtPayPal(id, { notifyClient });
      clearInvoiceCaches();
      return { cancelled: true, notified: notifyClient };
    },
  });
}

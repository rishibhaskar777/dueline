import "server-only";
import { today } from "@/lib/clock";
import { InvoiceNotFoundError } from "@/lib/invoices/errors";
import { PayPalApiError } from "@/lib/paypal/errors";
import { getInvoice, recordExternalPayment } from "@/lib/paypal/invoices";
import { clearInvoiceCaches, summarise } from "@/lib/paypal/summaries";
import { runClaimed } from "@/lib/requests/run-claimed";
import { getStore } from "@/lib/store";
import type { Json } from "@/lib/store/store";
import type { RecordPaymentRequest, RecordPaymentResponse } from "@/types";
import { assertCanRecordPayment } from "./invoice-actions";

const DEFAULT_NOTE = "Recorded in Dueline";

function fromStored(value: Json): RecordPaymentResponse {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    if (value.recorded === true && typeof value.paidOn === "string") {
      return { recorded: true, paidOn: value.paidOn };
    }
  }
  throw new Error("The stored result of this request cannot be read.");
}

async function checkRecordable(id: string, request: RecordPaymentRequest): Promise<void> {
  try {
    assertCanRecordPayment(summarise(await getInvoice(id)), request, today());
  } catch (error) {
    if (error instanceof PayPalApiError && error.status === 404) throw new InvoiceNotFoundError();
    throw error;
  }
}

// A payment made outside PayPal is recorded as EXTERNAL, so PayPal marks the invoice as paid. It
// sends nothing to the client, so the demo guard has nothing to check.
export function recordPayment(
  id: string,
  request: RecordPaymentRequest,
): Promise<RecordPaymentResponse> {
  const { requestId, ...body } = request;
  return runClaimed(getStore(), {
    requestId,
    body: { id, ...body },
    messages: {
      conflict: "This request ID was already used for a different payment.",
      inProgress: "This payment is still being recorded. Check the invoice page in a moment.",
    },
    readStored: fromStored,
    run: async () => {
      await checkRecordable(id, request);
      await recordExternalPayment(id, {
        paymentDate: request.paidOn,
        method: request.method,
        note: request.note?.trim() || DEFAULT_NOTE,
      });
      clearInvoiceCaches();
      return { recorded: true, paidOn: request.paidOn };
    },
  });
}

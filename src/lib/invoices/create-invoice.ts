import "server-only";
import { today } from "@/lib/clock";
import { assertSandboxBuyers } from "@/lib/demo-guard";
import { ConfigError } from "@/lib/env";
import { PayPalApiError, PayPalTimeoutError } from "@/lib/paypal/errors";
import { requestMemo, toPayPalInvoice } from "@/lib/paypal/invoice-body";
import {
  createDraftInvoice,
  getInvoice,
  nextInvoiceNumber,
  sendInvoice,
} from "@/lib/paypal/invoices";
import {
  clearInvoiceCaches,
  findInvoiceByMemo,
  recipientsOf,
  summarise,
} from "@/lib/paypal/summaries";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { getProfile } from "@/lib/profile";
import { claimRequest } from "@/lib/requests/claim-request";
import { hashRequestBody } from "@/lib/requests/body-hash";
import { getStore } from "@/lib/store";
import type { Json } from "@/lib/store/store";
import type { CreateInvoiceRequest, CreateInvoiceResponse, SendInvoiceResponse } from "@/types";
import { CreateOutcomeUnknownError, InvoiceNotFoundError } from "./errors";

type NewInvoice = Omit<CreateInvoiceRequest, "requestId">;

const INVOICE_CONFLICT =
  "This request ID was already used for different details. Check Receivables before creating the invoice again.";

function toStored(result: CreateInvoiceResponse): Json {
  return JSON.parse(JSON.stringify(result)) as Json;
}

function fromStored(value: Json): CreateInvoiceResponse {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value.sent === "boolean" &&
    typeof value.invoice === "object" &&
    value.invoice !== null
  ) {
    return value as unknown as CreateInvoiceResponse;
  }
  throw new Error("The stored result of this request cannot be read.");
}

async function createDraft(input: NewInvoice, requestId: string): Promise<PayPalInvoice> {
  const body = toPayPalInvoice(input.draft, {
    invoiceNumber: await nextInvoiceNumber(),
    invoiceDate: today(),
    requestId,
    profile: await getProfile(),
    discount: input.discount,
  });
  return createDraftInvoice(body, requestId);
}

// A rejected request or a bad configuration means PayPal made nothing. A server error or a
// timeout leaves it unknown, so the claim stays and the request is resolved later.
function nothingWasCreated(error: unknown): boolean {
  return error instanceof ConfigError || (error instanceof PayPalApiError && error.status < 500);
}

async function createOrFind(
  input: NewInvoice,
  requestId: string,
  recovered: boolean,
): Promise<PayPalInvoice> {
  const found = recovered ? await findInvoiceByMemo(requestMemo(requestId)) : undefined;
  if (found) return found;

  try {
    return await createDraft(input, requestId);
  } catch (error) {
    if (nothingWasCreated(error)) await getStore().release(requestId);
    throw error instanceof PayPalTimeoutError ? new CreateOutcomeUnknownError() : error;
  }
}

async function sendCreated(
  draft: PayPalInvoice,
  requestId: string,
): Promise<CreateInvoiceResponse> {
  if (draft.status === "DRAFT") {
    try {
      await sendInvoice(draft.id, requestId);
    } catch (error) {
      if (error instanceof PayPalApiError || error instanceof PayPalTimeoutError) {
        return { invoice: summarise(draft), sent: false };
      }
      throw error;
    }
  }
  const current = await getInvoice(draft.id);
  clearInvoiceCaches();
  return { invoice: summarise(current), sent: true };
}

export async function createAndSendInvoice(
  input: NewInvoice,
  requestId: string,
): Promise<CreateInvoiceResponse> {
  assertSandboxBuyers([input.draft.client.email]);

  const store = getStore();
  const claim = await claimRequest(
    store,
    requestId,
    hashRequestBody(input),
    {
      conflict: INVOICE_CONFLICT,
      inProgress: "This invoice is still being created. Check Receivables before trying again.",
    },
    fromStored,
  );
  if (claim.kind === "replay") return claim.result;

  const draft = await createOrFind(input, requestId, claim.recovered);
  const result = await sendCreated(draft, requestId);
  await store.complete(requestId, toStored(result));
  return result;
}

// Sending is safe to repeat: an invoice PayPal already shows as sent is returned as it is.
export async function sendExistingDraft(
  invoiceId: string,
  requestId: string,
): Promise<SendInvoiceResponse> {
  const store = getStore();
  const claim = await claimRequest(
    store,
    requestId,
    hashRequestBody({ invoiceId }),
    {
      conflict: INVOICE_CONFLICT,
      inProgress: "This invoice is still being sent. Check Receivables before trying again.",
    },
    fromStored,
  );
  if (claim.kind === "replay") return { invoice: claim.result.invoice, sent: true };

  try {
    const invoice = await getInvoice(invoiceId);
    if (invoice.status === "DRAFT") {
      assertSandboxBuyers(recipientsOf(invoice));
      await sendInvoice(invoiceId, requestId);
    }
    const current = invoice.status === "DRAFT" ? await getInvoice(invoiceId) : invoice;
    clearInvoiceCaches();
    const result: SendInvoiceResponse = { invoice: summarise(current), sent: true };
    await store.complete(requestId, toStored(result));
    return result;
  } catch (error) {
    await store.release(requestId);
    if (error instanceof PayPalApiError && error.status === 404) throw new InvoiceNotFoundError();
    throw error;
  }
}

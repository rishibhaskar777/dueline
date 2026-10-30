import "server-only";
import { today } from "@/lib/clock";
import { ConfigError, getEnv, SANDBOX_BUYER_DOMAIN } from "@/lib/env";
import { PayPalApiError, PayPalTimeoutError } from "@/lib/paypal/errors";
import { requestMemo, toPayPalInvoice } from "@/lib/paypal/invoice-body";
import {
  createDraftInvoice,
  getInvoice,
  nextInvoiceNumber,
  sendInvoice,
} from "@/lib/paypal/invoices";
import { toInvoiceSummary } from "@/lib/paypal/map";
import { clearInvoiceCaches, findInvoiceByMemo } from "@/lib/paypal/summaries";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { getStore } from "@/lib/store";
import type { Json, Store } from "@/lib/store/store";
import type {
  CreateInvoiceRequest,
  CreateInvoiceResponse,
  InvoiceSummary,
  SendInvoiceResponse,
} from "@/types";
import { hashRequestBody } from "./body-hash";
import {
  CreateOutcomeUnknownError,
  DuplicateRequestError,
  InvoiceNotFoundError,
  RecipientNotAllowedError,
} from "./errors";

type NewInvoice = Omit<CreateInvoiceRequest, "requestId">;

type Acquired =
  { kind: "replay"; result: CreateInvoiceResponse } | { kind: "owned"; recovered: boolean };

// A request that has been in progress this long was most likely cut off, so it may be resolved.
const STALE_CLAIM_MS = 2 * 60 * 1000;

const SEND_NOTE =
  "Thank you for your business. You can pay securely with PayPal using the link in this email.";

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

// A repeat of a request that is still running is refused. Once the request is old enough to have
// been cut off, one caller takes it over: release only succeeds for one of them, and for it alone.
async function acquire(
  store: Store,
  requestId: string,
  bodyHash: string,
  inProgressMessage: string,
): Promise<Acquired> {
  const claim = await store.claim(requestId, bodyHash);
  if (claim.kind === "new") return { kind: "owned", recovered: false };
  if (claim.kind === "replay") return { kind: "replay", result: fromStored(claim.result) };
  if (claim.kind === "conflict") {
    throw new DuplicateRequestError(
      "This request ID was already used for different details. Check Receivables before creating the invoice again.",
    );
  }

  if (!(await store.release(requestId, STALE_CLAIM_MS))) {
    throw new DuplicateRequestError(inProgressMessage);
  }
  const again = await store.claim(requestId, bodyHash);
  if (again.kind !== "new") throw new DuplicateRequestError(inProgressMessage);
  return { kind: "owned", recovered: true };
}

function assertSandboxBuyers(emails: string[]): void {
  if (!getEnv().DEMO_MODE) return;
  if (emails.some((email) => !email.toLowerCase().endsWith(SANDBOX_BUYER_DOMAIN))) {
    throw new RecipientNotAllowedError();
  }
}

function recipientsOf(invoice: PayPalInvoice): string[] {
  return (invoice.primary_recipients ?? []).map(
    (recipient) => recipient.billing_info.email_address,
  );
}

function summarise(invoice: PayPalInvoice): InvoiceSummary {
  const summary = toInvoiceSummary(invoice, today(), null);
  if (!summary) throw new Error("PayPal returned an invoice without a usable amount.");
  return summary;
}

function sendMessage(invoice: PayPalInvoice): { subject: string; note: string } {
  return { subject: `Invoice ${invoice.detail.invoice_number}`, note: SEND_NOTE };
}

async function createDraft(input: NewInvoice, requestId: string): Promise<PayPalInvoice> {
  const body = toPayPalInvoice(input.draft, {
    invoiceNumber: await nextInvoiceNumber(),
    invoiceDate: today(),
    requestId,
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
      await sendInvoice(draft.id, sendMessage(draft), requestId);
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
  const claim = await acquire(
    store,
    requestId,
    hashRequestBody(input),
    "This invoice is still being created. Check Receivables before trying again.",
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
  const claim = await acquire(
    store,
    requestId,
    hashRequestBody({ invoiceId }),
    "This invoice is still being sent. Check Receivables before trying again.",
  );
  if (claim.kind === "replay") return { invoice: claim.result.invoice, sent: true };

  try {
    const invoice = await getInvoice(invoiceId);
    if (invoice.status === "DRAFT") {
      assertSandboxBuyers(recipientsOf(invoice));
      await sendInvoice(invoiceId, sendMessage(invoice), requestId);
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

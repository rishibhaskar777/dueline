import "server-only";
import { todayInKolkata } from "@/lib/clock";
import { assertSandboxBuyers } from "@/lib/demo-guard";
import { InvoiceNotFoundError } from "@/lib/invoices/errors";
import { PayPalApiError } from "@/lib/paypal/errors";
import { getInvoice, remindInvoice } from "@/lib/paypal/invoices";
import { clearInvoiceCaches, recipientsOf, summarise } from "@/lib/paypal/summaries";
import { runClaimed } from "@/lib/requests/run-claimed";
import { getStore } from "@/lib/store";
import type { Json, Store } from "@/lib/store/store";
import type { InvoiceSummary, SendReminderRequest, SendReminderResponse } from "@/types";
import { hasLinkOrAddress } from "./check-reminder";
import { InvalidReminderError, ReminderLimitError } from "./errors";
import { recordPayPalLimit, remindersLeftToday } from "./daily-limit";
import { assertRemindable } from "./overdue";

const PAYPAL_LIMIT_MESSAGE =
  "PayPal allows two reminders a day for this account. Try again tomorrow.";
const SENT_TODAY_MESSAGE = "A reminder was already sent today for this invoice.";

function fromStored(value: Json): SendReminderResponse {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    if (typeof value.sentAt === "string") return { sentAt: value.sentAt };
  }
  throw new Error("The stored result of this request cannot be read.");
}

async function readRemindable(invoiceId: string): Promise<InvoiceSummary> {
  try {
    const invoice = await getInvoice(invoiceId);
    const summary = summarise(invoice);
    assertRemindable(summary);
    assertSandboxBuyers(recipientsOf(invoice));
    return summary;
  } catch (error) {
    if (error instanceof PayPalApiError && error.status === 404) throw new InvoiceNotFoundError();
    throw error;
  }
}

// The schema cannot know the client's name, which may look like a domain, so the links are
// checked here once the invoice is read.
function assertNoLinks(summary: InvoiceSummary, { subject, message }: SendReminderRequest): void {
  const own = { clientName: summary.client.name, work: summary.work };
  if (hasLinkOrAddress(subject, own)) {
    throw new InvalidReminderError("The subject must not contain links or email addresses.");
  }
  if (hasLinkOrAddress(message, own)) {
    throw new InvalidReminderError("The message must not contain links or email addresses.");
  }
}

// PayPal's limit counts real days, so the demo clock does not apply here.
async function assertNotSentToday(store: Store, invoiceId: string): Promise<void> {
  const today = todayInKolkata();
  const sent = await store.reminderHistory(invoiceId);
  if (sent.some(({ sentAt }) => todayInKolkata(new Date(sentAt)) === today)) {
    throw new ReminderLimitError(SENT_TODAY_MESSAGE);
  }
}

// The screen disables sending once the limit is used up; this keeps a direct call from asking
// PayPal for a reminder it will refuse.
async function assertUnderDailyLimit(store: Store): Promise<void> {
  if ((await remindersLeftToday(store)) === 0) throw new ReminderLimitError(PAYPAL_LIMIT_MESSAGE);
}

async function remind(store: Store, request: SendReminderRequest): Promise<void> {
  try {
    await remindInvoice(request.invoiceId, { subject: request.subject, note: request.message });
  } catch (error) {
    if (error instanceof PayPalApiError && error.status === 429) {
      await recordPayPalLimit(store);
      throw new ReminderLimitError(PAYPAL_LIMIT_MESSAGE);
    }
    throw error;
  }
}

async function recordSent(
  store: Store,
  { requestId, tone }: SendReminderRequest,
  invoice: InvoiceSummary,
  { sentAt }: SendReminderResponse,
): Promise<void> {
  await store.logReminder({ invoiceId: invoice.id, tone, sentAt });
  await store.addActivity({
    id: `reminder:${requestId}`,
    kind: "reminder_sent",
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    clientName: invoice.client.name,
    at: sentAt,
    amount: invoice.amount,
  });
  clearInvoiceCaches();
}

export function sendReminder(request: SendReminderRequest): Promise<SendReminderResponse> {
  const { requestId, ...body } = request;
  const store = getStore();
  let invoice: InvoiceSummary | undefined;
  return runClaimed(store, {
    requestId,
    body,
    messages: {
      conflict:
        "This request ID was already used for a different reminder. Draft it again to send.",
      inProgress: "This reminder is still being sent. Try again in a moment.",
    },
    readStored: fromStored,
    run: async () => {
      invoice = await readRemindable(request.invoiceId);
      assertNoLinks(invoice, request);
      await assertNotSentToday(store, request.invoiceId);
      await assertUnderDailyLimit(store);
      await remind(store, request);
      return { sentAt: new Date().toISOString() };
    },
    afterRun: async (result) => {
      if (invoice) await recordSent(store, request, invoice, result);
    },
  });
}

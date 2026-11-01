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
import { ReminderLimitError } from "./errors";
import { recordPayPalLimit, remindersLeftToday } from "./daily-limit";
import { assertRemindable } from "./overdue";

const PAYPAL_LIMIT_MESSAGE =
  "PayPal allows two reminders a day for this account. Try again tomorrow.";
const SENT_TODAY_MESSAGES = {
  paypal: "A PayPal reminder was already sent today for this invoice.",
  email: "A message from your email was already recorded today for this invoice.",
};

function fromStored(value: Json): SendReminderResponse {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    if (typeof value.sentAt === "string") return { sentAt: value.sentAt };
  }
  throw new Error("The stored result of this request cannot be read.");
}

// An email goes from the freelancer's own account, so the demo guard has no recipient of ours to
// check; a PayPal reminder is emailed by PayPal and the guard applies.
async function readRemindable(
  invoiceId: string,
  channel: SendReminderRequest["channel"],
): Promise<InvoiceSummary> {
  try {
    const invoice = await getInvoice(invoiceId);
    const summary = summarise(invoice);
    assertRemindable(summary);
    if (channel === "paypal") assertSandboxBuyers(recipientsOf(invoice));
    return summary;
  } catch (error) {
    if (error instanceof PayPalApiError && error.status === 404) throw new InvoiceNotFoundError();
    throw error;
  }
}

// One reminder per invoice, per channel, per India day; PayPal's limit counts real days, so the demo
// clock does not apply here.
async function assertNotSentToday(
  store: Store,
  invoiceId: string,
  channel: SendReminderRequest["channel"],
): Promise<void> {
  const today = todayInKolkata();
  const sent = await store.reminderHistory(invoiceId);
  const again = sent.some(
    (entry) => entry.channel === channel && todayInKolkata(new Date(entry.sentAt)) === today,
  );
  if (again) {
    throw new ReminderLimitError(SENT_TODAY_MESSAGES[channel]);
  }
}

// The screen disables sending once the limit is used up; this keeps a direct call from asking
// PayPal for a reminder it will refuse.
async function assertUnderDailyLimit(store: Store): Promise<void> {
  if ((await remindersLeftToday(store)) === 0) throw new ReminderLimitError(PAYPAL_LIMIT_MESSAGE);
}

async function remind(store: Store, invoiceId: string): Promise<void> {
  try {
    await remindInvoice(invoiceId);
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
  { requestId, tone, channel }: SendReminderRequest,
  invoice: InvoiceSummary,
  { sentAt }: SendReminderResponse,
): Promise<void> {
  await store.logReminder({ invoiceId: invoice.id, tone, sentAt, channel });
  await store.addActivity({
    id: `reminder:${requestId}`,
    kind: channel === "paypal" ? "reminder_sent" : "email_sent",
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    clientName: invoice.client.name,
    at: sentAt,
    amount: invoice.amount,
  });
  clearInvoiceCaches();
}

// "paypal" asks PayPal to send its standard reminder. "email" is the freelancer saying they sent their
// own message; nothing is sent from here. Both count for the tone of the next reminder.
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
      invoice = await readRemindable(request.invoiceId, request.channel);
      await assertNotSentToday(store, request.invoiceId, request.channel);
      if (request.channel === "paypal") {
        await assertUnderDailyLimit(store);
        await remind(store, request.invoiceId);
      }
      return { sentAt: new Date().toISOString() };
    },
    afterRun: async (result) => {
      if (invoice) await recordSent(store, request, invoice, result);
    },
  });
}

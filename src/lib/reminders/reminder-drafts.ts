import "server-only";
import { reserveDailyModelCall } from "@/lib/ai/quota";
import { inBatches } from "@/lib/in-batches";
import { InvoiceNotFoundError } from "@/lib/invoices/errors";
import { loadInvoices, type LoadedInvoice } from "@/lib/paypal/summaries";
import { getStore } from "@/lib/store";
import type { ReminderDraft, Tone } from "@/types";
import { draftReminderText } from "./draft-reminder";
import { factsOf } from "./facts";
import { assertRemindable, isRemindable } from "./overdue";
import { suggestTone } from "./tone";

const MAX_DRAFTS = 10;
const MODEL_CALLS_AT_A_TIME = 2;

interface DraftOptions {
  beforeModelCall?: () => Promise<void>;
}

async function historyOf(invoiceId: string): Promise<ReminderDraft["history"]> {
  const entries = await getStore().reminderHistory(invoiceId);
  return entries
    .map(({ tone, sentAt }) => ({ tone, sentAt }))
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

// Without a tone the draft is in the suggested one.
async function draftFor(
  { summary, amountDue }: LoadedInvoice,
  tone: Tone | null,
  options: DraftOptions,
): Promise<ReminderDraft> {
  const history = await historyOf(summary.id);
  const suggestedTone = suggestTone(summary.daysLate, history);
  const chosen = tone ?? suggestedTone;
  const text = await draftReminderText(factsOf(summary, amountDue), chosen, options);
  return {
    invoiceId: summary.id,
    tone: chosen,
    suggestedTone,
    subject: text.subject,
    message: text.message,
    source: text.source,
    history,
  };
}

// The most days late come first, and the page stays small enough to draft quickly.
export async function listReminderDrafts(): Promise<ReminderDraft[]> {
  const overdue = (await loadInvoices())
    .filter(({ summary }) => isRemindable(summary))
    .sort(
      (a, b) =>
        b.summary.daysLate - a.summary.daysLate || a.summary.number.localeCompare(b.summary.number),
    )
    .slice(0, MAX_DRAFTS);

  return inBatches(overdue, MODEL_CALLS_AT_A_TIME, (loaded) =>
    draftFor(loaded, null, { beforeModelCall: reserveDailyModelCall }),
  );
}

export async function draftReminderFor(
  invoiceId: string,
  tone: Tone,
  options: DraftOptions,
): Promise<ReminderDraft> {
  const loaded = (await loadInvoices()).find(({ summary }) => summary.id === invoiceId);
  if (!loaded) throw new InvoiceNotFoundError();
  assertRemindable(loaded.summary);
  return draftFor(loaded, tone, options);
}

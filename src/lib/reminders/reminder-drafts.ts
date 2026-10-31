import "server-only";
import { reserveDailyModelCall } from "@/lib/ai/quota";
import { inBatches } from "@/lib/in-batches";
import { InvoiceNotFoundError } from "@/lib/invoices/errors";
import { loadInvoices, type LoadedInvoice } from "@/lib/paypal/summaries";
import { getProfile } from "@/lib/profile";
import { riskLevelsById } from "@/lib/risk/client-risk";
import { getStore } from "@/lib/store";
import type { Profile, ReminderDraft, RiskLevel, Tone } from "@/types";
import { draftReminderText } from "./draft-reminder";
import { factsOf } from "./facts";
import { assertRemindable, isRemindable } from "./overdue";
import { withSignOff } from "./sign-off";
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
  risk: RiskLevel | null,
  tone: Tone | null,
  profile: Profile,
  options: DraftOptions,
): Promise<ReminderDraft> {
  const history = await historyOf(summary.id);
  const suggestedTone = suggestTone(summary.daysLate, history, risk);
  const chosen = tone ?? suggestedTone;
  const text = await draftReminderText(factsOf(summary, amountDue), chosen, options);
  return {
    invoiceId: summary.id,
    tone: chosen,
    suggestedTone,
    subject: text.subject,
    message: withSignOff(text.message, profile),
    source: text.source,
    history,
  };
}

// The most days late come first, and the page stays small enough to draft quickly.
export async function listReminderDrafts(): Promise<ReminderDraft[]> {
  const [all, profile] = await Promise.all([loadInvoices(), getProfile()]);
  const levels = riskLevelsById(all.map(({ summary }) => summary));
  const overdue = all
    .filter(({ summary }) => isRemindable(summary))
    .sort(
      (a, b) =>
        b.summary.daysLate - a.summary.daysLate || a.summary.number.localeCompare(b.summary.number),
    )
    .slice(0, MAX_DRAFTS);

  return inBatches(overdue, MODEL_CALLS_AT_A_TIME, (loaded) =>
    draftFor(loaded, levels.get(loaded.summary.id) ?? null, null, profile, {
      beforeModelCall: reserveDailyModelCall,
    }),
  );
}

export async function draftReminderFor(
  invoiceId: string,
  tone: Tone,
  options: DraftOptions,
): Promise<ReminderDraft> {
  const [all, profile] = await Promise.all([loadInvoices(), getProfile()]);
  const loaded = all.find(({ summary }) => summary.id === invoiceId);
  if (!loaded) throw new InvoiceNotFoundError();
  assertRemindable(loaded.summary);
  const levels = riskLevelsById(all.map(({ summary }) => summary));
  return draftFor(loaded, levels.get(invoiceId) ?? null, tone, profile, options);
}

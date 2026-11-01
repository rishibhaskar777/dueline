import "server-only";
import { reserveDailyModelCall } from "@/lib/ai/quota";
import { inBatches } from "@/lib/in-batches";
import { InvoiceNotFoundError } from "@/lib/invoices/errors";
import { loadInvoices, type LoadedInvoice } from "@/lib/paypal/summaries";
import { getProfile } from "@/lib/profile";
import { clientKey } from "@/lib/risk/client-key";
import { riskLevelsById } from "@/lib/risk/client-risk";
import { getStore } from "@/lib/store";
import type { Profile, ReminderDraft, ReminderLanguage, RiskLevel, Tone } from "@/types";
import { cachedReminderText, draftReminderText } from "./draft-reminder";
import { factsOf } from "./facts";
import { assertRemindable, isRemindable } from "./overdue";
import { withSignOff } from "./sign-off";
import { templateReminder } from "./templates";
import { suggestTone } from "./tone";

const MAX_DRAFTS = 10;
const MODEL_CALLS_AT_A_TIME = 2;

interface DraftOptions {
  beforeModelCall?: () => Promise<void>;
  // Writes the draft in this language instead of the one saved for the client.
  language?: ReminderLanguage;
}

interface Context {
  loaded: LoadedInvoice;
  risk: RiskLevel | null;
  profile: Profile;
}

async function historyOf(invoiceId: string): Promise<ReminderDraft["history"]> {
  const entries = await getStore().reminderHistory(invoiceId);
  return entries
    .map(({ tone, sentAt }) => ({ tone, sentAt }))
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

function languageOf(
  { loaded }: Context,
  chosen: ReminderLanguage | undefined,
): Promise<ReminderLanguage> {
  return chosen
    ? Promise.resolve(chosen)
    : getStore().getClientLanguage(clientKey(loaded.summary.client.name));
}

// Without a tone the draft is in the suggested one. A draft that calls the model is the finished
// answer; `pending` is only for the quick draft that has not asked the model yet.
async function draftFor(
  context: Context,
  tone: Tone | null,
  options: DraftOptions,
): Promise<ReminderDraft> {
  const { loaded, risk, profile } = context;
  const [history, language] = await Promise.all([
    historyOf(loaded.summary.id),
    languageOf(context, options.language),
  ]);
  const suggestedTone = suggestTone(loaded.summary.daysLate, history, risk);
  const chosen = tone ?? suggestedTone;
  const text = await draftReminderText(factsOf(loaded.summary, loaded.amountDue), chosen, {
    ...options,
    language,
  });
  return {
    invoiceId: loaded.summary.id,
    tone: chosen,
    suggestedTone,
    language,
    subject: text.subject,
    message: withSignOff(text.message, profile, language),
    source: text.source,
    pending: false,
    history,
  };
}

// The stored answer of the model when there is one, otherwise the template, marked pending so the
// screen can ask for a better draft afterwards. It never calls the model.
async function quickDraftFor(context: Context): Promise<ReminderDraft> {
  const { loaded, risk, profile } = context;
  const [history, language] = await Promise.all([
    historyOf(loaded.summary.id),
    languageOf(context, undefined),
  ]);
  const tone = suggestTone(loaded.summary.daysLate, history, risk);
  const facts = factsOf(loaded.summary, loaded.amountDue);
  const cached = await cachedReminderText(facts, tone, language);
  const text = cached ?? {
    ...templateReminder(facts, tone, language),
    source: "template" as const,
  };
  return {
    invoiceId: loaded.summary.id,
    tone,
    suggestedTone: tone,
    language,
    subject: text.subject,
    message: withSignOff(text.message, profile, language),
    source: text.source,
    pending: cached === null,
    history,
  };
}

// The most days late come first, and the page stays small enough to read at a glance.
async function overdueContexts(): Promise<Context[]> {
  const [all, profile] = await Promise.all([loadInvoices(), getProfile()]);
  const levels = riskLevelsById(all.map(({ summary }) => summary));
  return all
    .filter(({ summary }) => isRemindable(summary))
    .sort(
      (a, b) =>
        b.summary.daysLate - a.summary.daysLate || a.summary.number.localeCompare(b.summary.number),
    )
    .slice(0, MAX_DRAFTS)
    .map((loaded) => ({ loaded, risk: levels.get(loaded.summary.id) ?? null, profile }));
}

export async function listReminderDrafts(): Promise<ReminderDraft[]> {
  return Promise.all((await overdueContexts()).map(quickDraftFor));
}

// Writes and stores a draft for every overdue invoice, two model calls at a time, so the first visit
// of the day finds them ready. When the day's allowance is used up the templates stand in.
export async function prepareReminderDrafts(): Promise<ReminderDraft[]> {
  return inBatches(await overdueContexts(), MODEL_CALLS_AT_A_TIME, (context) =>
    draftFor(context, null, { beforeModelCall: reserveDailyModelCall }),
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
  return draftFor({ loaded, risk: levels.get(invoiceId) ?? null, profile }, tone, options);
}

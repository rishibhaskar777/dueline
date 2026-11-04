import "server-only";
import { reserveDailyModelCall } from "@/lib/ai/quota";
import { today } from "@/lib/clock";
import { inBatches } from "@/lib/in-batches";
import { InvoiceNotFoundError } from "@/lib/invoices/errors";
import { loadVisibleInvoices } from "@/lib/demo/visible-invoices";
import type { LoadedInvoice } from "@/lib/paypal/summaries";
import { getProfile } from "@/lib/profile";
import { clientKey } from "@/lib/risk/client-key";
import { riskScoresById } from "@/lib/risk/client-risk";
import { getStore } from "@/lib/store";
import type { Profile, ReminderDraft, ReminderLanguage, Tone } from "@/types";
import type { ReminderText } from "./check-reminder";
import { cachedReminderText, draftReminderText } from "./draft-reminder";
import { factsOf } from "./facts";
import { languageSuggestionFor } from "./country-language";
import { isHeadsUpDue } from "./heads-up";
import { paypalRefusedHeadsUp } from "./heads-up-refusal";
import { assertRemindable, daysUntilDue, isNotYetDue, isRemindable } from "./overdue";
import { withSignOff } from "./sign-off";
import { templateReminder } from "./templates";
import {
  headsUpReason,
  isPromiseActive,
  isPromiseMissed,
  suggestTone,
  toneReason,
  type Lateness,
} from "./tone";

const MAX_DRAFTS = 10;
const MODEL_CALLS_AT_A_TIME = 2;

interface DraftOptions {
  beforeModelCall?: () => Promise<void>;
  // Writes the draft in this language instead of the one saved for the client.
  language?: ReminderLanguage;
}

interface Context {
  loaded: LoadedInvoice;
  lateness: Lateness | null;
  profile: Profile;
}

async function historyOf(invoiceId: string): Promise<ReminderDraft["history"]> {
  const entries = await getStore().reminderHistory(invoiceId);
  return entries
    .map(({ tone, sentAt, channel }) => ({ tone, sentAt, channel }))
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

// Offered while the freelancer has not chosen a language for the client and their country suggests one.
async function suggestionOf({ loaded }: Context): Promise<ReminderLanguage | null> {
  const { name, country } = loaded.summary.client;
  return languageSuggestionFor(country, await getStore().hasClientLanguage(clientKey(name)));
}

// The reminders as the tone rules count them: a heads-up before the due date is not a chase, so it
// does not make the first late reminder firm.
function chases(history: ReminderDraft["history"]): ReminderDraft["history"] {
  return history.filter(({ tone }) => tone !== "heads_up");
}

interface Reading {
  history: ReminderDraft["history"];
  language: ReminderLanguage;
  languageSuggestion: ReminderLanguage | null;
  suggestedTone: Tone;
  reason: string;
  paypalRefused: boolean;
}

async function readingOf(context: Context, chosen: ReminderLanguage | undefined): Promise<Reading> {
  const { loaded, lateness } = context;
  const { summary } = loaded;
  const [history, language, languageSuggestion, paypalRefused] = await Promise.all([
    historyOf(summary.id),
    languageOf(context, chosen),
    suggestionOf(context),
    paypalRefusedHeadsUp(getStore(), summary.id),
  ]);
  const day = today();
  const sent = chases(history);
  const missed = isPromiseMissed(summary.promise, day);
  const suggestedTone = suggestTone(summary.daysLate, sent, lateness?.level ?? null, missed);
  const reason =
    suggestedTone === "heads_up"
      ? headsUpReason(daysUntilDue(summary, day))
      : toneReason(
          suggestedTone,
          summary.daysLate,
          sent.length,
          lateness,
          missed ? summary.promise : undefined,
        );
  return { history, language, languageSuggestion, suggestedTone, reason, paypalRefused };
}

function draftOf(
  { loaded, profile }: Context,
  reading: Reading,
  tone: Tone,
  text: ReminderText & { source: ReminderDraft["source"] },
  pending: boolean,
): ReminderDraft {
  const { history, language, languageSuggestion, suggestedTone, reason, paypalRefused } = reading;
  return {
    invoiceId: loaded.summary.id,
    tone,
    suggestedTone,
    reason,
    language,
    languageSuggestion,
    subject: text.subject,
    message: withSignOff(text.message, profile, language),
    source: text.source,
    pending,
    ...(loaded.summary.promise ? { promise: loaded.summary.promise } : {}),
    ...(tone === "heads_up" && paypalRefused ? { paypalRefused: true as const } : {}),
    history,
  };
}

// Without a tone the draft is in the suggested one. A draft that calls the model is the finished
// answer; `pending` is only for the quick draft that has not asked the model yet.
async function draftFor(
  context: Context,
  tone: Tone | null,
  options: DraftOptions,
): Promise<ReminderDraft> {
  const { loaded } = context;
  const reading = await readingOf(context, options.language);
  const chosen = tone ?? reading.suggestedTone;
  const text = await draftReminderText(
    factsOf(loaded.summary, loaded.amountDue, chases(reading.history).length),
    chosen,
    { ...options, language: reading.language },
  );
  return draftOf(context, reading, chosen, text, false);
}

// The stored answer of the model when there is one, otherwise the template, marked pending so the
// screen can ask for a better draft afterwards. It never calls the model.
async function quickDraftFor(context: Context): Promise<ReminderDraft> {
  const { loaded } = context;
  const reading = await readingOf(context, undefined);
  const tone = reading.suggestedTone;
  const facts = factsOf(loaded.summary, loaded.amountDue, chases(reading.history).length);
  const cached = await cachedReminderText(facts, tone, reading.language);
  const text = cached ?? {
    ...templateReminder(facts, tone, reading.language),
    source: "template" as const,
  };
  return draftOf(context, reading, tone, text, cached === null);
}

interface Pool {
  all: LoadedInvoice[];
  profile: Profile;
  scores: ReturnType<typeof riskScoresById>;
}

async function loadPool(): Promise<Pool> {
  const [all, profile] = await Promise.all([loadVisibleInvoices(), getProfile()]);
  return { all, profile, scores: riskScoresById(all.map(({ summary }) => summary)) };
}

const contextOf =
  ({ profile, scores }: Pool) =>
  (loaded: LoadedInvoice): Context => ({
    loaded,
    lateness: scores.get(loaded.summary.id) ?? null,
    profile,
  });

// The most days late come first, and the page stays small enough to read at a glance. The morning
// run leaves out an invoice whose client has promised a date that has not come yet.
function overdueContexts(pool: Pool, skipPromised: boolean): Context[] {
  const day = today();
  return pool.all
    .filter(
      ({ summary }) =>
        isRemindable(summary) && !(skipPromised && isPromiseActive(summary.promise, day)),
    )
    .sort(
      (a, b) =>
        b.summary.daysLate - a.summary.daysLate || a.summary.number.localeCompare(b.summary.number),
    )
    .slice(0, MAX_DRAFTS)
    .map(contextOf(pool));
}

// Invoices that fall due soon and have had no heads-up yet, the soonest first.
async function headsUpContexts(pool: Pool): Promise<Context[]> {
  if (!pool.profile.sendHeadsUp) return [];
  const day = today();
  const waiting = pool.all.filter(({ summary }) => isNotYetDue(summary));
  const histories = await Promise.all(waiting.map(({ summary }) => historyOf(summary.id)));
  return waiting
    .filter(({ summary }, index) => isHeadsUpDue(summary, histories[index], pool.profile, day))
    .sort(
      (a, b) =>
        a.summary.dueOn.localeCompare(b.summary.dueOn) ||
        a.summary.number.localeCompare(b.summary.number),
    )
    .slice(0, MAX_DRAFTS)
    .map(contextOf(pool));
}

export async function listReminderDrafts(): Promise<ReminderDraft[]> {
  return Promise.all(overdueContexts(await loadPool(), false).map(quickDraftFor));
}

// The invoices due soon that have had no heads-up, in the same quick form as the late drafts.
export async function listHeadsUpDrafts(): Promise<ReminderDraft[]> {
  const contexts = await headsUpContexts(await loadPool());
  return Promise.all(contexts.map(quickDraftFor));
}

// Writes and stores a draft for every overdue invoice and every heads-up, two model calls at a time,
// so the first visit of the day finds them ready. When the day's allowance is used up the templates
// stand in. Only the late drafts are returned: they are what the Today queue is made of.
export async function prepareReminderDrafts(): Promise<ReminderDraft[]> {
  const pool = await loadPool();
  const prepare = (context: Context): Promise<ReminderDraft> =>
    draftFor(context, null, { beforeModelCall: reserveDailyModelCall });
  const drafts = await inBatches(overdueContexts(pool, true), MODEL_CALLS_AT_A_TIME, prepare);
  await inBatches(await headsUpContexts(pool), MODEL_CALLS_AT_A_TIME, prepare);
  return drafts;
}

export async function draftReminderFor(
  invoiceId: string,
  tone: Tone,
  options: DraftOptions,
): Promise<ReminderDraft> {
  const pool = await loadPool();
  const loaded = pool.all.find(({ summary }) => summary.id === invoiceId);
  if (!loaded) throw new InvoiceNotFoundError();
  assertRemindable(loaded.summary, tone);
  return draftFor(contextOf(pool)(loaded), tone, options);
}

import { todayInKolkata } from "@/lib/date-math";
import { formatDayMonth } from "@/lib/format-date";
import { languageInfo } from "@/lib/reminders/languages";
import { suggestTone } from "@/lib/reminders/tone";
import type { InvoiceSummary, ReminderDraft, ReminderLanguage, Tone } from "@/types";

export const TONE_LABELS: Record<Tone, string> = {
  gentle: "Gentle",
  firm: "Firm",
  final: "Final",
};

type SentReminder = ReminderDraft["history"][number];

const clock = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export function daysLateLabel(daysLate: number): string {
  return `${daysLate} ${daysLate === 1 ? "day" : "days"} late`;
}

export function historyLabel({ tone, sentAt }: SentReminder): string {
  return `${TONE_LABELS[tone]} reminder sent ${formatDayMonth(todayInKolkata(new Date(sentAt)))}`;
}

// Dueline sends one reminder per invoice per India day, whatever the demo clock says.
export function wasSentToday(history: SentReminder[], now: Date = new Date()): boolean {
  const today = todayInKolkata(now);
  return history.some(({ sentAt }) => todayInKolkata(new Date(sentAt)) === today);
}

type DraftText = Pick<ReminderDraft, "subject" | "message">;

export function hasEdits(drafted: DraftText, current: DraftText): boolean {
  return current.subject !== drafted.subject || current.message !== drafted.message;
}

export type ImprovedOutcome = "apply" | "keep-edits" | "ignore";

// The model's draft replaces the template only while the user has not touched the text. Once they
// have, their words stay; once a send has started, nothing changes under it.
export function improvedOutcome(
  drafted: DraftText,
  current: DraftText,
  sendStarted: boolean,
): ImprovedOutcome {
  if (sendStarted) return "ignore";
  return hasEdits(drafted, current) ? "keep-edits" : "apply";
}

export function replaceEditsQuestion(tone: Tone, language: ReminderLanguage = "en"): string {
  const draft = `${TONE_LABELS[tone]} draft`;
  return language === "en"
    ? `Replace your edits with a ${draft}?`
    : `Replace your edits with a ${draft} in ${languageInfo(language).name}?`;
}

export function sentMessage(sentAt: string): string {
  return `Sent at ${clock.format(new Date(sentAt))}. PayPal emailed the client with a Pay now link.`;
}

export function sourceNote(source: ReminderDraft["source"]): string {
  return source === "ai"
    ? "Drafted by Dueline AI. Read and edit before sending."
    : "Template draft (AI unavailable).";
}

export const IMPROVING_NOTE = "Improving the draft…";

export const KEPT_EDITS_NOTE = "A better draft was ready, but your edits were kept.";

export const LIMIT_REACHED_NOTICE =
  "Today's PayPal reminder limit for the demo account is used up. Drafts still work; sending resumes tomorrow.";

// Says so when the client's record is what made the suggestion firmer than the days alone would.
export function toneReason(invoice: InvoiceSummary, draft: ReminderDraft): string | null {
  if (invoice.riskLevel !== "late_payer") return null;
  if (suggestTone(invoice.daysLate, draft.history, null) === draft.suggestedTone) return null;
  const tone = TONE_LABELS[draft.suggestedTone].toLowerCase();
  return `Suggested ${tone} because ${invoice.client.name} is a late payer.`;
}

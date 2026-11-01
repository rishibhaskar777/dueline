import { todayInKolkata } from "@/lib/date-math";
import { formatDayMonth } from "@/lib/format-date";
import { languageInfo } from "@/lib/reminders/languages";
import type { ReminderChannel, ReminderDraft, ReminderLanguage, Tone } from "@/types";

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

export function historyLabel({ tone, sentAt, channel }: SentReminder): string {
  const how = channel === "email" ? "message sent from your email" : "reminder sent through PayPal";
  return `${TONE_LABELS[tone]} ${how} ${formatDayMonth(todayInKolkata(new Date(sentAt)))}`;
}

// One reminder per invoice per channel per India day, whatever the demo clock says.
export function sentTodayVia(
  history: SentReminder[],
  channel: ReminderChannel,
  now: Date = new Date(),
): boolean {
  const today = todayInKolkata(now);
  return history.some(
    (entry) => entry.channel === channel && todayInKolkata(new Date(entry.sentAt)) === today,
  );
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

export function sentMessage(sentAt: string, channel: ReminderChannel): string {
  const time = clock.format(new Date(sentAt));
  return channel === "email"
    ? `Recorded at ${time}: you sent your message from your own email.`
    : `Sent at ${time}. PayPal emailed the client its standard reminder with a Pay now button.`;
}

export function sourceNote(source: ReminderDraft["source"]): string {
  return source === "ai"
    ? "Drafted by Dueline AI. Read and edit before sending."
    : "Template draft (AI unavailable).";
}

export const IMPROVING_NOTE = "Improving the draft…";

export const KEPT_EDITS_NOTE = "A better draft was ready, but your edits were kept.";

export const LIMIT_REACHED_NOTICE =
  "Today's PayPal reminder limit for the demo account is used up. Drafts and your own email still work; PayPal reminders resume tomorrow.";

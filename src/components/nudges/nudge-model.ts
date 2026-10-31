import { todayInKolkata } from "@/lib/date-math";
import { formatDayMonth } from "@/lib/format-date";
import type { ReminderDraft, Tone } from "@/types";

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

export function replaceEditsQuestion(tone: Tone): string {
  return `Replace your edits with a ${TONE_LABELS[tone]} draft?`;
}

export function sentMessage(sentAt: string): string {
  return `Sent at ${clock.format(new Date(sentAt))}. PayPal emailed the client with a Pay now link.`;
}

export function sourceNote(source: ReminderDraft["source"]): string {
  return source === "ai"
    ? "Drafted by Dueline AI. Read and edit before sending."
    : "Template draft (AI unavailable).";
}

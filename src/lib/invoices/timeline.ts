import { addDays } from "@/lib/date-math";
import { toKolkataDate } from "@/lib/clock";
import { isDemoMemo } from "@/lib/demo/story";
import { storyMoment } from "@/lib/demo/story-events";
import { isRecordedOutsidePayPal } from "@/lib/paypal/map";
import type { PayPalInvoice } from "@/lib/paypal/types";
import type { ActivityEvent, InvoiceSummary, ReminderChannel, TimelineEvent, Tone } from "@/types";

interface TimelineInput {
  invoice: PayPalInvoice;
  summary: InvoiceSummary;
  reminders: { tone: Tone; sentAt: string; channel: ReminderChannel }[];
  // Only this invoice's events.
  activity: ActivityEvent[];
  today: string;
}

// A story invoice is created when the demo is reset but stands for work done on the story's dates.
const isStory = ({ invoice }: TimelineInput): boolean => isDemoMemo(invoice.detail.memo);

function createdEvent(input: TimelineInput): TimelineEvent[] {
  const { invoice, summary } = input;
  const at = isStory(input)
    ? storyMoment(summary.issuedOn)
    : (invoice.detail.metadata?.create_time ?? summary.issuedOn);
  return [{ id: "created", kind: "created", at }];
}

function sentEvent(input: TimelineInput): TimelineEvent[] {
  const { invoice, summary, activity } = input;
  if (invoice.status === "DRAFT") return [];
  const reported = activity.find(({ kind }) => kind === "sent");
  const at = isStory(input)
    ? storyMoment(summary.issuedOn)
    : (invoice.detail.metadata?.first_sent_time ?? reported?.at ?? summary.issuedOn);
  return [{ id: "sent", kind: "sent", at }];
}

function paidEvent({ summary }: TimelineInput): TimelineEvent[] {
  const at = summary.actualPayout?.paidAt ?? summary.paidOn;
  if (summary.dueState !== "paid" || !at) return [];
  return [
    {
      id: "paid",
      kind: "paid",
      at,
      via: isRecordedOutsidePayPal(summary.paypalStatus) ? "outside_paypal" : "paypal",
    },
  ];
}

function cancelledAt({ invoice, summary }: TimelineInput): string | null {
  if (invoice.status !== "CANCELLED") return null;
  return invoice.detail.metadata?.last_update_time ?? summary.issuedOn;
}

function cancelledEvent(input: TimelineInput): TimelineEvent[] {
  const at = cancelledAt(input);
  return at ? [{ id: "cancelled", kind: "cancelled", at }] : [];
}

// The invoice was still waiting for its payment on this day: not paid by then and not cancelled.
function wasUnpaidOn(day: string, input: TimelineInput): boolean {
  const { summary } = input;
  if (summary.dueState === "paid" && (summary.paidOn === null || summary.paidOn < day)) {
    return false;
  }
  const cancelled = cancelledAt(input);
  return cancelled === null || (toKolkataDate(cancelled) ?? cancelled) >= day;
}

// Two dates every invoice has: the day it fell due, and the day after, when an unpaid invoice
// became overdue. Neither is shown before it has come.
function milestones(input: TimelineInput): TimelineEvent[] {
  const { invoice, summary, today } = input;
  if (invoice.status === "DRAFT") return [];
  const events: TimelineEvent[] = [];
  if (summary.dueOn <= today) events.push({ id: "due", kind: "due", at: summary.dueOn });

  const overdueOn = addDays(summary.dueOn, 1);
  if (overdueOn <= today && wasUnpaidOn(overdueOn, input)) {
    events.push({ id: "overdue", kind: "overdue", at: overdueOn });
  }
  return events;
}

// What happens later in an invoice's life comes first when two events share a moment, as created and
// sent do for a story invoice.
const LIFECYCLE: Record<TimelineEvent["kind"], number> = {
  created: 0,
  sent: 1,
  viewed: 2,
  reminder: 2,
  due: 3,
  overdue: 4,
  paid: 5,
  cancelled: 6,
};

// Newest first. A date without a time sorts before the timestamps of the same day.
export function buildTimeline(input: TimelineInput): TimelineEvent[] {
  const { reminders, activity } = input;
  const events: TimelineEvent[] = [
    ...createdEvent(input),
    ...sentEvent(input),
    ...milestones(input),
    ...reminders.map(({ tone, sentAt, channel }) => ({
      id: `reminder:${sentAt}`,
      kind: "reminder" as const,
      at: sentAt,
      tone,
      channel,
    })),
    ...activity
      .filter(({ kind }) => kind === "viewed")
      .map(({ id, at }) => ({ id, kind: "viewed" as const, at })),
    ...paidEvent(input),
    ...cancelledEvent(input),
  ];
  return events.sort((a, b) => b.at.localeCompare(a.at) || LIFECYCLE[b.kind] - LIFECYCLE[a.kind]);
}

import { isRecordedOutsidePayPal } from "@/lib/paypal/map";
import type { PayPalInvoice } from "@/lib/paypal/types";
import type { ActivityEvent, InvoiceSummary, TimelineEvent, Tone } from "@/types";

interface TimelineInput {
  invoice: PayPalInvoice;
  summary: InvoiceSummary;
  reminders: { tone: Tone; sentAt: string }[];
  // Only this invoice's events.
  activity: ActivityEvent[];
}

function sentEvent({ invoice, summary, activity }: TimelineInput): TimelineEvent[] {
  if (invoice.status === "DRAFT") return [];
  const reported = activity.find(({ kind }) => kind === "sent");
  const at = invoice.detail.metadata?.first_sent_time ?? reported?.at ?? summary.issuedOn;
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

function cancelledEvent({ invoice, summary }: TimelineInput): TimelineEvent[] {
  if (invoice.status !== "CANCELLED") return [];
  const at = invoice.detail.metadata?.last_update_time ?? summary.issuedOn;
  return [{ id: "cancelled", kind: "cancelled", at }];
}

// Newest first. A date without a time sorts before the timestamps of the same day.
export function buildTimeline(input: TimelineInput): TimelineEvent[] {
  const { invoice, summary, reminders, activity } = input;
  const events: TimelineEvent[] = [
    {
      id: "created",
      kind: "created",
      at: invoice.detail.metadata?.create_time ?? summary.issuedOn,
    },
    ...sentEvent(input),
    ...reminders.map(({ tone, sentAt }) => ({
      id: `reminder:${sentAt}`,
      kind: "reminder" as const,
      at: sentAt,
      tone,
    })),
    ...activity
      .filter(({ kind }) => kind === "viewed")
      .map(({ id, at }) => ({ id, kind: "viewed" as const, at })),
    ...paidEvent(input),
    ...cancelledEvent(input),
  ];
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

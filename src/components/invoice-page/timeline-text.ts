import { formatDate, formatDayMonth, formatTimestamp } from "@/lib/format-date";
import type { TimelineEvent } from "@/types";

function reminderText({ tone, channel }: TimelineEvent): string {
  if (tone === "heads_up") {
    return channel === "email" ? "Heads-up sent from your email" : "Heads-up sent through PayPal";
  }
  const how = channel === "email" ? "Message sent from your email" : "Reminder sent through PayPal";
  return tone ? `${how} (${tone} tone)` : how;
}

export function describeTimelineEvent(event: TimelineEvent): string {
  switch (event.kind) {
    case "created":
      return "Invoice created";
    case "sent":
      return "Sent to your client";
    case "viewed":
      return "Your client viewed the invoice";
    case "reminder":
      return reminderText(event);
    case "promised":
      return event.promisedOn
        ? `Client promised to pay by ${formatDayMonth(event.promisedOn)}`
        : "Client promised a date";
    case "due":
      return "Payment due date";
    case "overdue":
      return "Became overdue, still unpaid";
    case "paid":
      return event.via === "outside_paypal" ? "Paid outside PayPal" : "Paid through PayPal";
    case "cancelled":
      return "Invoice cancelled";
  }
}

// PayPal sometimes gives only a date, and then no time is shown.
export function timelineWhen(at: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(at) ? formatDate(at) : formatTimestamp(at);
}

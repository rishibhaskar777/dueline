import { isRecordedOutsidePayPal } from "@/lib/paypal/map";
import type { ActivityEvent, InvoiceSummary } from "@/types";

const STORY_EVENT_HOUR = "09:00:00+05:30";

// 09:00 India time on a story date, the one rule for every event the story invents.
export function storyMoment(date: string): string {
  return new Date(`${date}T${STORY_EVENT_HOUR}`).toISOString();
}

// A story invoice is created when the demo is reset but stands for work done earlier, so its events
// happened on the story's dates. A payment made through PayPal really happened when it was reported.
// An event is never placed in the future.
export function storyEventAt(
  kind: ActivityEvent["kind"],
  summary: InvoiceSummary,
  reported: string,
): string {
  const date =
    kind === "sent"
      ? summary.issuedOn
      : kind === "paid" && isRecordedOutsidePayPal(summary.paypalStatus)
        ? summary.paidOn
        : null;
  if (!date) return reported;
  const story = storyMoment(date);
  return story < new Date(reported).toISOString() ? story : reported;
}

// Seeding and a later webhook for the same invoice and kind share this id, so the feed holds one row.
export function storyActivityId(generation: number, key: string, kind: "sent" | "paid"): string {
  return `demo:${generation}:${key}:${kind}`;
}

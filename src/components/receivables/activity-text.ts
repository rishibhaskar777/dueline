import { todayInKolkata } from "@/lib/date-math";
import { formatDayMonth } from "@/lib/format-date";
import { formatMoney } from "@/lib/money/format";
import type { ActivityEvent } from "@/types";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
// Past this, "54 days ago" says less than the date does.
const DATE_AFTER_DAYS = 7;

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function describeEvent(event: ActivityEvent): string {
  const { clientName, invoiceNumber, amount } = event;
  switch (event.kind) {
    case "paid":
      return amount ? `${clientName} paid ${formatMoney(amount)}` : `${clientName} paid`;
    case "sent":
      return `Invoice ${invoiceNumber} sent to ${clientName}`;
    case "viewed":
      return `${clientName} viewed invoice ${invoiceNumber}`;
    case "overdue":
      return `Invoice ${invoiceNumber} to ${clientName} is overdue`;
    case "reminder_sent":
      return `Reminder for invoice ${invoiceNumber} sent to ${clientName}`;
  }
}

function referenceMs(today: string, now: number): number {
  return todayInKolkata(new Date(now)) === today ? now : Date.parse(`${today}T23:59:59+05:30`);
}

// With the demo clock the app's "today" is not the real day, so the end of that day stands in for
// the current moment. A timestamp after the reference reads as "just now".
export function relativeTime(at: string, today: string, now: number = Date.now()): string {
  const eventMs = Date.parse(at);
  if (Number.isNaN(eventMs)) return "";

  const elapsed = referenceMs(today, now) - eventMs;

  if (elapsed < MINUTE_MS) return "just now";
  if (elapsed < HOUR_MS) return relative.format(-Math.floor(elapsed / MINUTE_MS), "minute");
  if (elapsed < DAY_MS) return relative.format(-Math.floor(elapsed / HOUR_MS), "hour");
  return relative.format(-Math.floor(elapsed / DAY_MS), "day");
}

export function findNewEvents(previous: ActivityEvent[], next: ActivityEvent[]): ActivityEvent[] {
  const known = new Set(previous.map((event) => event.id));
  return next.filter((event) => !known.has(event.id));
}

// Recent events read as "2 hours ago"; older ones, such as a demo invoice sent months back, as a date.
export function eventWhen(at: string, today: string, now: number = Date.now()): string {
  const eventMs = Date.parse(at);
  if (!Number.isNaN(eventMs) && referenceMs(today, now) - eventMs >= DATE_AFTER_DAYS * DAY_MS) {
    return formatDayMonth(todayInKolkata(new Date(eventMs)));
  }
  return relativeTime(at, today, now);
}

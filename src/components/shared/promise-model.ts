import { formatDayMonth } from "@/lib/format-date";
import { isPromiseDateAllowed, PROMISE_RANGE_MESSAGE } from "@/lib/promises/promise-range";
import { isPromiseActive, isPromiseMissed } from "@/lib/reminders/tone";
import type { PaymentPromise } from "@/types";

// "Promised for 10 Nov" while the date is ahead, "Promised 10 Nov, still unpaid" once it has passed.
export function promiseStatus(promise: PaymentPromise, today: string): string {
  const date = formatDayMonth(promise.promisedOn);
  return isPromiseMissed(promise, today)
    ? `Promised ${date}, still unpaid`
    : `Promised for ${date}`;
}

// The one line a late invoice's card shrinks to while the client's promised date has not passed.
export function collapsedLine(promise: PaymentPromise | undefined, today: string): string | null {
  return promise && isPromiseActive(promise, today) ? promiseStatus(promise, today) : null;
}

// What the form says about the date it holds, or null when it can be saved.
export function promiseDateError(date: string, today: string): string | null {
  if (date === "") return "Pick the date the client promised.";
  return isPromiseDateAllowed(date, today) ? null : PROMISE_RANGE_MESSAGE;
}

import { addDays } from "@/lib/date-math";

export const PROMISE_MAX_DAYS = 60;
export const PROMISE_NOTE_MAX = 200;

// A promised date is today or up to 60 days ahead, in India time.
export function promiseRange(today: string): { min: string; max: string } {
  return { min: today, max: addDays(today, PROMISE_MAX_DAYS) };
}

export function isPromiseDateAllowed(date: string, today: string): boolean {
  const { min, max } = promiseRange(today);
  return date >= min && date <= max;
}

export const PROMISE_RANGE_MESSAGE = `Pick a date from today to ${PROMISE_MAX_DAYS} days ahead.`;

import { addDays } from "@/lib/date-math";

const NET = /\bnet[\s-]?(\d{1,3})\b/i;
const WITHIN_DAYS = /\b(?:within|in)\s+(\d{1,3})\s+days\b/i;
const STATED_DATE =
  /\b(?:pay(?:ment)?\s+(?:is\s+)?(?:due|by)|due\s+(?:on|by)|pay\s+by)\s+(\d{4}-\d{2}-\d{2})\b/i;
// A day count counts only in a sentence about paying, so "I can finish within 3 days" never does.
const PAYMENT_WORD = /\b(?:pay\w*|paid|invoice\w*|due|settle\w*|transfer\w*|bhej\w*)\b/i;
const SENTENCE_BREAK = /[.?!]+(?=\s|$)|\n/;
// A short note such as "15 days" has no "payment" in front of it, so it is read on its own.
const BARE_DAYS = /\b(\d{1,3})\s+days\b/i;
// The words a note can use to say "net 15" without adding anything else.
const TERM_WORDS =
  /\b(?:net|payments?|pay|terms?|due|within|in|of|from|the|on|by|invoice|receipt|days?|\d+)\b/gi;

// Payment terms a chat states in days or as a date, as the date the client must pay by. "net N"
// always counts; a plain number of days counts only in a sentence that is about payment.
export function dueDateIn(text: string, today: string): string | null {
  const net = NET.exec(text);
  if (net) return addDays(today, Number(net[1]));
  const stated = STATED_DATE.exec(text)?.[1];
  if (stated) return stated;
  for (const sentence of text.split(SENTENCE_BREAK)) {
    const days = PAYMENT_WORD.test(sentence) ? WITHIN_DAYS.exec(sentence) : null;
    if (days) return addDays(today, Number(days[1]));
  }
  return null;
}

export function dueDateInNote(note: string, today: string): string | null {
  const days = BARE_DAYS.exec(note);
  return dueDateIn(note, today) ?? (days ? addDays(today, Number(days[1])) : null);
}

// A note that only says when to pay belongs in the due date, so it is not kept as a payment term.
export function restatesDueTerms(note: string, today: string): boolean {
  if (dueDateInNote(note, today) === null) return false;
  return note.replace(TERM_WORDS, "").replace(/[^\p{L}\p{N}]+/gu, "") === "";
}

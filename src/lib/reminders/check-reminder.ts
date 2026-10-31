import { toMinorUnits } from "@/lib/money/decimal";
import { withoutContacts, type ReminderFacts } from "./facts";
import { SIGN_OFF_ROOM } from "./sign-off";

export const REMINDER_LIMITS = {
  subject: { min: 5, max: 120 },
  message: { min: 20, max: 900 },
} as const;

export interface ReminderText {
  subject: string;
  message: string;
}

const LINK =
  /https?:\/\/|\bwww\.|\b[a-z0-9-]+\.(?:com|net|org|io|co|in|app|dev|me|ai|uk|us|ca|au|eu)\b/i;
const ADDRESS = /\S@\S/;

const CURRENCY_CODES = "USD|EUR|GBP|CAD|AUD";
const NUMBER = String.raw`\d[\d,]*(?:\.\d+)?`;
// A code or symbol before the number, a code after it, or a number with two decimals.
const MONEY = new RegExp(
  String.raw`(?:(?<before>${CURRENCY_CODES})\s?|[$€£]\s?)(?<a>${NUMBER})` +
    String.raw`|(?<b>${NUMBER})\s?(?<after>${CURRENCY_CODES})\b` +
    String.raw`|\b(?<c>\d[\d,]*\.\d{2})\b`,
  "gi",
);

type OwnWords = Pick<ReminderFacts, "clientName" | "work">;

// The client's business name and the work description come from the invoice, so a client called
// "Acme.io" is not a link. The longer one goes first because the work may contain the name.
function withoutOwnWords(text: string, { clientName, work }: OwnWords): string {
  return [clientName, work]
    .map(withoutContacts)
    .filter((phrase): phrase is string => phrase !== null)
    .sort((a, b) => b.length - a.length)
    .reduce((rest, phrase) => rest.replaceAll(phrase, " "), text);
}

export function hasLinkOrAddress(text: string, own: OwnWords): boolean {
  const rest = withoutOwnWords(text, own);
  return LINK.test(rest) || ADDRESS.test(rest);
}

function isAmount(
  value: string,
  code: string | undefined,
  amount: ReminderFacts["amount"],
): boolean {
  if (code && code.toUpperCase() !== amount.currency) return false;
  try {
    return toMinorUnits(value.replaceAll(",", "")) === toMinorUnits(amount.value);
  } catch {
    return false;
  }
}

// The model must not change what is owed, so every amount it writes has to be the invoice's.
function amountsMatch(text: string, amount: ReminderFacts["amount"]): boolean {
  return [...text.matchAll(MONEY)].every(({ groups }) => {
    const value = groups?.a ?? groups?.b ?? groups?.c;
    return value !== undefined && isAmount(value, groups?.before ?? groups?.after, amount);
  });
}

function within(text: string, { min, max }: { min: number; max: number }): boolean {
  return text.length >= min && text.length <= max;
}

// Returns the trimmed text when it is safe to show, otherwise null. The message is the body only;
// the sign-off is added later, so room is kept for it.
export function checkReminderText(facts: ReminderFacts, draft: ReminderText): ReminderText | null {
  const subject = draft.subject.trim();
  const message = draft.message.trim();
  const body = {
    min: REMINDER_LIMITS.message.min,
    max: REMINDER_LIMITS.message.max - SIGN_OFF_ROOM,
  };
  if (!within(subject, REMINDER_LIMITS.subject) || !within(message, body)) {
    return null;
  }
  if (!message.includes(facts.invoiceNumber)) return null;

  const text = `${subject}\n${message}`;
  if (hasLinkOrAddress(text, facts) || !amountsMatch(text, facts.amount)) return null;
  return { subject, message };
}

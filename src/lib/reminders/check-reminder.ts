import { toMinorUnits } from "@/lib/money/decimal";
import type { ReminderLanguage } from "@/types";
import { withoutContacts, type ReminderFacts } from "./facts";
import { languageInfo, type Separators } from "./languages";
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

// A code or symbol before the number, a code after it, or a number with two decimals. The group and
// decimal marks are those of the language the reminder is written in.
function moneyPattern({ group, decimal }: Separators): RegExp {
  const mark = decimal === "." ? String.raw`\.` : decimal;
  const number = String.raw`\d[\d${group}]*(?:${mark}\d+)?`;
  return new RegExp(
    String.raw`(?:(?<before>${CURRENCY_CODES})\s?|[$€£]\s?)(?<a>${number})` +
      String.raw`|(?<b>${number})\s?(?<after>${CURRENCY_CODES})\b` +
      String.raw`|\b(?<c>\d[\d${group}]*${mark}\d{2})\b`,
    "gi",
  );
}

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

// "1.250,00" becomes "1250.00" for a language that groups with dots and has a decimal comma.
function toPlainNumber(value: string, { group, decimal }: Separators): string {
  const marks = new RegExp(String.raw`[${group}${decimal === "." ? String.raw`\.` : decimal}]+$`);
  return value
    .replace(marks, "")
    .replace(new RegExp(`[${group}]`, "g"), "")
    .replace(decimal, ".");
}

function isAmount(
  value: string,
  code: string | undefined,
  amount: ReminderFacts["amount"],
  separators: Separators,
): boolean {
  if (code && code.toUpperCase() !== amount.currency) return false;
  try {
    return toMinorUnits(toPlainNumber(value, separators)) === toMinorUnits(amount.value);
  } catch {
    return false;
  }
}

// The model must not change what is owed, so every amount it writes has to be the invoice's.
function amountsMatch(
  text: string,
  amount: ReminderFacts["amount"],
  language: ReminderLanguage,
): boolean {
  const separators = languageInfo(language);
  return [...text.matchAll(moneyPattern(separators))].every(({ groups }) => {
    const value = groups?.a ?? groups?.b ?? groups?.c;
    return (
      value !== undefined && isAmount(value, groups?.before ?? groups?.after, amount, separators)
    );
  });
}

function within(text: string, { min, max }: { min: number; max: number }): boolean {
  return text.length >= min && text.length <= max;
}

// Returns the trimmed text when it is safe to show, otherwise null. The message is the body only;
// the sign-off is added later, so room is kept for it. Amounts are read the way `language` writes
// numbers.
export function checkReminderText(
  facts: ReminderFacts,
  draft: ReminderText,
  language: ReminderLanguage = "en",
): ReminderText | null {
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
  if (hasLinkOrAddress(text, facts) || !amountsMatch(text, facts.amount, language)) return null;
  return { subject, message };
}

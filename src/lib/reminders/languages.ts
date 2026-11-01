import { formatDate } from "@/lib/format-date";
import type { Money, ReminderLanguage } from "@/types";

export interface Separators {
  // Every character the language may use between groups of digits.
  group: string;
  decimal: string;
}

interface LanguageInfo extends Separators {
  code: ReminderLanguage;
  name: string;
  locale: string;
  // The character written between groups when Dueline writes an amount.
  written: string;
  indianGrouping: boolean;
  thanks: string;
}

export const LANGUAGES: readonly LanguageInfo[] = [
  {
    code: "en",
    name: "English",
    locale: "en-IN",
    group: ",",
    decimal: ".",
    written: ",",
    indianGrouping: false,
    thanks: "Thank you",
  },
  {
    code: "de",
    name: "German",
    locale: "de-DE",
    group: ".",
    decimal: ",",
    written: ".",
    indianGrouping: false,
    thanks: "Vielen Dank",
  },
  {
    code: "fr",
    name: "French",
    locale: "fr-FR",
    group: "  ",
    decimal: ",",
    written: " ",
    indianGrouping: false,
    thanks: "Merci",
  },
  {
    code: "es",
    name: "Spanish",
    locale: "es-ES",
    group: ".",
    decimal: ",",
    written: ".",
    indianGrouping: false,
    thanks: "Gracias",
  },
  {
    code: "nl",
    name: "Dutch",
    locale: "nl-NL",
    group: ".",
    decimal: ",",
    written: ".",
    indianGrouping: false,
    thanks: "Alvast bedankt",
  },
  {
    code: "pt",
    name: "Portuguese",
    locale: "pt-PT",
    group: ".",
    decimal: ",",
    written: ".",
    indianGrouping: false,
    thanks: "Obrigado",
  },
  {
    code: "hi",
    name: "Hindi",
    locale: "hi-IN",
    group: ",",
    decimal: ".",
    written: ",",
    indianGrouping: true,
    thanks: "धन्यवाद",
  },
];

const DEFAULT_SIGN_OFF = "Thank you";

export function languageInfo(code: ReminderLanguage): LanguageInfo {
  const found = LANGUAGES.find((language) => language.code === code);
  if (!found) throw new RangeError(`Unknown reminder language: ${code}`);
  return found;
}

function groupDigits(whole: string, { written, indianGrouping }: LanguageInfo): string {
  if (whole.length <= 3) return whole;
  const last = whole.slice(-3);
  let rest = whole.slice(0, -3);
  const parts: string[] = [];
  const size = indianGrouping ? 2 : 3;
  while (rest.length > size) {
    parts.unshift(rest.slice(-size));
    rest = rest.slice(0, -size);
  }
  parts.unshift(rest);
  return [...parts, last].join(written);
}

// The amount the way that language writes numbers, with the currency code after it. It works on the
// decimal string, so no float is involved.
export function formatAmount(language: ReminderLanguage, { currency, value }: Money): string {
  const info = languageInfo(language);
  const [whole, fraction = ""] = value.split(".");
  return `${groupDigits(whole, info)}${info.decimal}${fraction.padEnd(2, "0")} ${currency}`;
}

// English reminders keep the currency code first, as the invoice and the checks write it.
export function amountText(language: ReminderLanguage, money: Money): string {
  return language === "en" ? `${money.currency} ${money.value}` : formatAmount(language, money);
}

export function formatDateIn(language: ReminderLanguage, date: string): string {
  if (language === "en") return formatDate(date);
  const { locale } = languageInfo(language);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

// The default sign-off follows the reminder's language; one the freelancer wrote is kept.
export function signOffIn(language: ReminderLanguage, signOff: string): string {
  return signOff === DEFAULT_SIGN_OFF ? languageInfo(language).thanks : signOff;
}

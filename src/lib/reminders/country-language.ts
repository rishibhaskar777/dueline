import type { ReminderLanguage } from "@/types";

// Only languages the reminders can be written in. India is left out on purpose: Dueline's clients
// are abroad, and a client in India is not an export client. Belgium has no single language, so it
// is left to the freelancer.
const LANGUAGE_BY_COUNTRY: Readonly<Record<string, ReminderLanguage>> = {
  PT: "pt",
  BR: "pt",
  DE: "de",
  AT: "de",
  CH: "de",
  FR: "fr",
  LU: "fr",
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  CL: "es",
  PE: "es",
  NL: "nl",
};

// The language to offer for a client's billing country, or null when English is the sensible default.
export function suggestedLanguage(country: string | null | undefined): ReminderLanguage | null {
  return country ? (LANGUAGE_BY_COUNTRY[country.toUpperCase()] ?? null) : null;
}

// A suggestion is made only while the freelancer has not chosen a language for the client.
export function languageSuggestionFor(
  country: string | null | undefined,
  chosen: boolean,
): ReminderLanguage | null {
  return chosen ? null : suggestedLanguage(country);
}

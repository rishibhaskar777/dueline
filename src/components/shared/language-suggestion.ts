import { countryName } from "@/lib/countries";
import { languageInfo } from "@/lib/reminders/languages";
import type { ReminderLanguage } from "@/types";

// "Okafor & Reyes is in Portugal. Write reminders in Portuguese?"
export function suggestionQuestion(
  clientName: string,
  country: string | null | undefined,
  language: ReminderLanguage,
): string {
  const where = countryName(country);
  const place = where ? `${clientName} is in ${where}.` : `${clientName} is abroad.`;
  return `${place} Write reminders in ${languageInfo(language).name}?`;
}

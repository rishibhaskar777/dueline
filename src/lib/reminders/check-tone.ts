import type { ReminderLanguage, Tone } from "@/types";
import type { ReminderText } from "./check-reminder";
import { FINAL_AFTER_REMINDERS } from "./tone";

// Words that belong to a soft nudge and have no place in a firm or final message, and words that
// announce the end of the chasing and have no place in a gentle or firm one. English is checked in
// every language; the others hold what the template packs say in that language.
const SOFT_WORDS: Record<ReminderLanguage, string[]> = {
  en: ["friendly", "gentle", "gently", "just a quick", "no rush", "whenever you can"],
  de: [
    "freundlich",
    "freundliche",
    "sanft",
    "kurze erinnerung",
    "keine eile",
    "wann immer sie können",
  ],
  fr: [
    "amical",
    "amicale",
    "petit rappel",
    "sans urgence",
    "pas de précipitation",
    "quand vous pouvez",
  ],
  es: ["amable", "amistoso", "breve recordatorio", "sin prisa", "cuando pueda"],
  nl: ["vriendelijk", "korte herinnering", "geen haast", "wanneer u kunt"],
  pt: ["amigável", "breve lembrete", "sem pressa", "quando puder"],
  hi: ["छोटा अनुस्मारक", "मित्रवत", "कोई जल्दी नहीं"],
};

const LAST_WORDS: Record<ReminderLanguage, string[]> = {
  en: ["final", "last reminder"],
  de: ["letzte erinnerung", "letzte mahnung"],
  fr: ["dernier rappel", "rappel final"],
  es: ["último recordatorio", "ultimo recordatorio", "recordatorio final"],
  nl: ["laatste herinnering", "laatste aanmaning"],
  pt: ["último lembrete", "lembrete final"],
  hi: ["अंतिम अनुस्मारक", "अंतिम"],
};

// A heads-up comes before the due date, so it never speaks of lateness, an overdue invoice or a
// deadline that has passed. English is checked in every language.
const LATE_WORDS: Record<ReminderLanguage, string[]> = {
  en: [
    "overdue",
    "late",
    "lateness",
    "past due",
    "past-due",
    "deadline",
    "missed",
    "behind",
    "has passed",
    "have passed",
    "was due",
  ],
  de: [
    "überfällig",
    "verspätet",
    "verspätung",
    "zu spät",
    "frist",
    "versäumt",
    "war fällig",
    "abgelaufen",
  ],
  fr: ["retard", "en retard", "dépassé", "dépassée", "échue", "était due", "en souffrance"],
  es: [
    "retraso",
    "atraso",
    "atrasada",
    "atrasado",
    "vencida",
    "vencido",
    "vencía",
    "fuera de plazo",
  ],
  nl: [
    "te laat",
    "achterstallig",
    "verlopen",
    "verstreken",
    "deadline",
    "gemist",
    "moest betaald zijn",
  ],
  pt: [
    "atraso",
    "atrasada",
    "atrasado",
    "vencida",
    "vencido",
    "venceu",
    "expirou",
    "prazo vencido",
  ],
  hi: ["बकाया", "देर", "विलंब", "देय था", "समय सीमा", "चूक", "अतिदेय"],
};

function wordsFor(table: Record<ReminderLanguage, string[]>, language: ReminderLanguage): string[] {
  return language === "en" ? table.en : [...table.en, ...table[language]];
}

function find(text: string, words: string[]): string | null {
  const lower = text.toLowerCase();
  return (
    words.find((word) => new RegExp(`(?<![\\p{L}])${word}(?![\\p{L}])`, "u").test(lower)) ?? null
  );
}

// Returns the phrase that contradicts the tone, or null when the words fit. A model that was asked
// for a firm message can still open with "just a quick reminder", and a message like that is sent
// under the wrong tone.
export function contradictingPhrase(
  tone: Tone,
  { subject, message }: ReminderText,
  language: ReminderLanguage,
  remindersSent: number = FINAL_AFTER_REMINDERS,
): string | null {
  const text = `${subject}\n${message}`;
  if (tone === "heads_up") {
    return find(text, wordsFor(LATE_WORDS, language)) ?? find(text, wordsFor(LAST_WORDS, language));
  }
  // A final message may call itself the last reminder only once two reminders have been sent.
  if (tone === "gentle" || tone === "firm" || remindersSent < FINAL_AFTER_REMINDERS) {
    const early = find(text, wordsFor(LAST_WORDS, language));
    if (early) return early;
  }
  return tone === "gentle" ? null : find(text, wordsFor(SOFT_WORDS, language));
}

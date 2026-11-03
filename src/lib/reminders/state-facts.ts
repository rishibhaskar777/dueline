import type { ReminderLanguage, Tone } from "@/types";
import type { ReminderText } from "./check-reminder";
import { amountText, formatDateIn, languageInfo } from "./languages";
import type { ReminderFacts } from "./facts";
import { dayWord, statedFactsSentence } from "./template-packs";

// A greeting is a short first line that ends in a comma, like "Dear Lena," or "Hi Okafor & Reyes team,".
const GREETING_LINE = /^[^\n]{1,80}[,:]$/;

// The month is recognised by its first letters in the language, so "Oct", "October" and "oct." all
// count; the day by its number standing alone.
function mentionsDate(text: string, language: ReminderLanguage, date: string): boolean {
  const at = new Date(`${date}T00:00:00Z`);
  const month = new Intl.DateTimeFormat(languageInfo(language).locale, {
    month: "long",
    timeZone: "UTC",
  })
    .format(at)
    .toLowerCase()
    .slice(0, 3);
  const day = at.getUTCDate();
  return text.toLowerCase().includes(month) && new RegExp(`(?<!\\d)${day}(?!\\d)`).test(text);
}

function mentionsDaysOverdue(text: string, language: ReminderLanguage, days: number): boolean {
  const word = dayWord(language).slice(0, 3);
  return new RegExp(`(?<!\\d)${days}(?!\\d)[\\s-]*${word}`, "iu").test(text);
}

// A firm or final reminder has to say when the invoice was due and how late it is. When the model's
// draft leaves either out, one sentence with both goes right after the greeting. Gentle drafts may
// keep their softer wording.
export function withStatedFacts(
  facts: ReminderFacts,
  tone: Tone,
  language: ReminderLanguage,
  draft: ReminderText,
): ReminderText {
  if (tone === "gentle") return draft;
  const { message } = draft;
  if (
    mentionsDate(message, language, facts.dueOn) &&
    mentionsDaysOverdue(message, language, facts.daysLate)
  ) {
    return draft;
  }

  const sentence = statedFactsSentence(language, {
    number: facts.invoiceNumber,
    owed: amountText(language, facts.amount),
    due: formatDateIn(language, facts.dueOn),
    daysLate: facts.daysLate,
  });
  const [first = "", ...rest] = message.replace(/\r\n?/g, "\n").split("\n");
  const body = rest.join("\n").trim();
  const text = GREETING_LINE.test(first.trim())
    ? [first.trim(), sentence, ...(body ? [body] : [])].join("\n\n")
    : [sentence, message.trim()].join("\n\n");
  return { subject: draft.subject, message: text };
}

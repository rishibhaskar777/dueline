import type { ReminderLanguage, Tone } from "@/types";
import type { ReminderText } from "./check-reminder";
import { withoutContacts, type ReminderFacts } from "./facts";
import { amountText, formatDateIn } from "./languages";
import { packTemplate } from "./template-packs";

// Used when the model is not available, so every part is fixed wording filled with the facts. The
// sign-off is added afterwards.
export function templateReminder(
  facts: ReminderFacts,
  tone: Tone,
  language: ReminderLanguage = "en",
): ReminderText {
  return packTemplate(language, tone, {
    number: facts.invoiceNumber,
    owed: amountText(language, facts.amount),
    work: withoutContacts(facts.work),
    due: formatDateIn(language, facts.dueOn),
    daysLate: facts.daysLate,
    name: withoutContacts(facts.clientName),
  });
}

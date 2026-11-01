import type { Profile, ReminderLanguage } from "@/types";
import { signOffIn } from "./languages";

// A model that signs off anyway would otherwise leave two closings.
const TRAILING_CLOSING =
  /\n+\s*(?:thank you|thanks|regards|best regards|kind regards|vielen dank|danke|mit freundlichen grüßen|merci|cordialement|gracias|saludos|atentamente|bedankt|alvast bedankt|met vriendelijke groet|obrigado|atenciosamente|धन्यवाद)[,.!]?\s*$/i;

// The longest closing the profile allows: 40 characters of sign-off, 60 of name and 120 of business
// name, and the line breaks. A signed message still has to fit the length the send route accepts.
export const SIGN_OFF_ROOM = 230;

// Every reminder ends the same way, whoever wrote the body: the sign-off, then the name, then the
// business name when it is not just the name again, each on its own line. With neither only the
// sign-off is written; a name is never invented. The default sign-off is written in the reminder's
// language.
export function withSignOff(
  body: string,
  { signOff, yourName, businessName }: Profile,
  language: ReminderLanguage = "en",
): string {
  const word = signOffIn(language, signOff);
  const business =
    businessName.trim().toLowerCase() === yourName.trim().toLowerCase() ? "" : businessName;
  const lines = [yourName, business].filter((line) => line.trim() !== "");
  const closing = lines.length > 0 ? `${word},\n${lines.join("\n")}` : word;
  return `${body.trim().replace(TRAILING_CLOSING, "")}\n\n${closing}`;
}

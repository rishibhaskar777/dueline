// WhatsApp exports start every line with a date and time. The AI and the offline reader should see
// "Name: text", while the quote check keeps working on the original chat: what is left of a line is
// always a piece of it.
const TIME = String.raw`\d{1,2}:\d{2}(?::\d{2})?(?:[\s\u202f\u00a0]*[AaPp]\.?[Mm]\.?)?`;
const DATE = String.raw`\d{1,2}/\d{1,2}/\d{2,4}`;

// iOS: "[28/10/26, 9:14 PM] Name: text". Android: "28/10/26, 21:14 - Name: text".
const PREFIX = new RegExp(
  String.raw`^[\u200e\u200f\s]*(?:\[${DATE},\s*${TIME}\]|${DATE},\s*${TIME}\s+-)\s*`,
);

export function stripChatPrefixes(chat: string): string {
  return chat
    .split("\n")
    .map((line) => line.replace(PREFIX, ""))
    .join("\n");
}

const SPEAKER = /^([^:\n\d$€£(]{1,40}?)(?:\s*\(([^)\n]{2,60})\))?:\s/;

export interface Speaker {
  person: string;
  // The company in brackets after the name, like "Kraftwerk Studio" in "Lena Fischer (Kraftwerk Studio)".
  company: string | null;
}

// The people who write in a chat, in order of appearance, read from lines that start "Name: text".
export function speakersOf(chat: string): Speaker[] {
  const found: Speaker[] = [];
  for (const line of stripChatPrefixes(chat).split("\n")) {
    const match = SPEAKER.exec(line.trim());
    if (!match) continue;
    const person = match[1].trim();
    if (!found.some((speaker) => speaker.person === person)) {
      found.push({ person, company: match[2]?.trim() ?? null });
    }
  }
  return found;
}

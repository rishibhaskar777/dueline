// A reminder body should read like a short letter: a greeting on its own line, then paragraphs of one
// or two sentences. Models and templates both go through here, so a message never arrives as one
// block.

const GREETING =
  /^(?:dear|hi|hello|hey|hallo|guten tag|sehr geehrte[rsn]?|bonjour|hola|estimad[oa]|beste|geachte|olá|ola|prezad[oa]|नमस्ते)(?=[\s,])[^,\n]{0,80},/iu;
const SENTENCE_END = /(?<=[.!?।])\s+/u;
const SENTENCES_PER_PARAGRAPH = 2;

// The thanks words of every language pack, plus the short forms models like. A thanks only counts
// when punctuation follows it, so "Merci de la régler" (please pay) and "Thank you for your
// patience" are left alone.
const THANKS_WORDS = [
  "thank you very much",
  "thank you so much",
  "thank you",
  "thanks",
  "vielen dank",
  "danke",
  "merci",
  "gracias",
  "alvast bedankt",
  "bedankt",
  "obrigado",
  "obrigada",
  "धन्यवाद",
];
const LEADING_THANKS = new RegExp(
  String.raw`^(?:${THANKS_WORDS.join("|")})\s*[,.!]\s*(?:(?:and|und|et|y|en|e|और)\s+)?`,
  "iu",
);
const STARTS_WITH_THANKS = new RegExp(String.raw`^(?:${THANKS_WORDS.join("|")}|thank)`, "iu");
const SLIPPED = /\b(It|it) is likely just slipped\b/g;

function paragraphsOf(block: string): string[] {
  const sentences = block.split(SENTENCE_END).filter(Boolean);
  if (sentences.length <= SENTENCES_PER_PARAGRAPH) return [block];
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += SENTENCES_PER_PARAGRAPH) {
    paragraphs.push(sentences.slice(i, i + SENTENCES_PER_PARAGRAPH).join(" "));
  }
  return paragraphs;
}

export function startsWithThanks(word: string): boolean {
  return STARTS_WITH_THANKS.test(word.trim());
}

// A sign-off that says thanks makes a thank you at the start of the last paragraph a second one:
// "Thank you, and please ignore this note" becomes "Please ignore this note". A paragraph that was
// only a thank you goes.
export function withoutRepeatedThanks(body: string): string {
  const paragraphs = body.trimEnd().split(/\n{2,}/);
  const last = paragraphs.pop() ?? "";
  const rest = last.trim().replace(LEADING_THANKS, "");
  if (rest !== "") {
    paragraphs.push(rest.charAt(0).toLocaleUpperCase() + rest.slice(1));
  }
  return paragraphs.join("\n\n");
}

export function normaliseMessage(message: string): string {
  const text = message
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(SLIPPED, "$1 may have slipped")
    .trim();

  const greeting = GREETING.exec(text)?.[0];
  const body = greeting ? text.slice(greeting.length).trim() : text;
  const blocks = body
    .split(/\n{2,}/)
    .map((block) => block.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .flatMap(paragraphsOf);
  return [...(greeting ? [greeting] : []), ...blocks].join("\n\n");
}

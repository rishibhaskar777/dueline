// A reminder body should read like a short letter: a greeting on its own line, then paragraphs of one
// or two sentences. Models and templates both go through here, so a message never arrives as one
// block.

const GREETING =
  /^(?:dear|hi|hello|hey|hallo|guten tag|sehr geehrte[rsn]?|bonjour|hola|estimad[oa]|beste|geachte|olá|ola|prezad[oa]|नमस्ते)(?=[\s,])[^,\n]{0,80},/iu;
const SENTENCE_END = /(?<=[.!?।])\s+/u;
const SENTENCES_PER_PARAGRAPH = 2;

function paragraphsOf(block: string): string[] {
  const sentences = block.split(SENTENCE_END).filter(Boolean);
  if (sentences.length <= SENTENCES_PER_PARAGRAPH) return [block];
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += SENTENCES_PER_PARAGRAPH) {
    paragraphs.push(sentences.slice(i, i + SENTENCES_PER_PARAGRAPH).join(" "));
  }
  return paragraphs;
}

export function normaliseMessage(message: string): string {
  const text = message
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
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

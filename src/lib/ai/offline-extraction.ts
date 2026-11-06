import { speakersOf, stripChatPrefixes } from "./chat-prefix";
import type { ModelDraft } from "./check-draft";
import { dueDateIn } from "./due-terms";

type ModelItem = ModelDraft["items"][number];

interface PurposeRule {
  pattern: RegExp;
  code: string;
  reason: string;
}

const PRICE =
  /(?:\b(?:USD|EUR|GBP|CAD|AUD)\s?|CA\$|A\$|C\$|[$€£])(\d+(?:,\d{2,3})*(?:\.\d{1,2})?)|\b(\d+(?:,\d{2,3})*(?:\.\d{1,2})?)\s?(?:USD|EUR|GBP|CAD|AUD)\b/g;

// The more specific symbols come first, because "CA$" also contains a "$".
const CURRENCIES: [RegExp, string][] = [
  [/CA\$|\bC\$|\bCAD\b/, "CAD"],
  [/\bA\$|\bAUD\b/, "AUD"],
  [/€|\bEUR\b/, "EUR"],
  [/£|\bGBP\b/, "GBP"],
  [/\$|\bUSD\b/, "USD"],
];

const PURPOSE_RULES: PurposeRule[] = [
  {
    pattern: /\b(?:app|software|api|backend|frontend|website development|coding)\b/i,
    code: "P0802",
    reason: "The chat describes software work.",
  },
  {
    pattern: /\b(?:social media|campaign|seo|marketing|banner ads?)\b/i,
    code: "P1007",
    reason: "The chat describes advertising or marketing work.",
  },
  {
    pattern: /\b(?:bookkeeping|accounting)\b/i,
    code: "P1005",
    reason: "The chat describes bookkeeping or accounting work.",
  },
  {
    pattern: /\b(?:logos?|brand|design|illustrations?|icons?|pitch deck|ui|ux)\b/i,
    code: "P1099",
    reason: "Design work has no closer match, so it is other services.",
  },
];

// "10 page brand guideline" asks for one guideline, so a count of pages, words or time is no quantity.
const MEASURES = "(?:pages?|words?|minutes?|days?|weeks?|months?)";
const CLAUSE_BREAK = /[.?!;]\s|\n|,\s/g;
const SPEAKER = /^[^:\n\d$€£]{1,40}:\s+/;
const LEADING_FILLER = /^(?:ok(?:ay)?|sure|so|and|then|yes|yeah|please|also)[\s,]+/i;
const TRAILING_CONNECTOR = /\s*(?:\b(?:for|at|is|are|only|just|about|x)\b|[@:=-])\s*$/i;
const UNIT = /^\s*(?:each\b|apiece\b|(?:an?|per)\s+([a-z]+)|\/\s*([a-z]+))/i;
// What comes before a price when nothing in it names the work: "I can pay", "the total is".
const NO_NAME =
  /^(?:(?:i|we|you|they)(?:'ll|'d)?\s+)?(?:(?:can|could|will|would|shall)\s+)?(?:pay|charge|do|offer|budget|bill|quote|(?:the\s+)?(?:total|price|fee|cost|budget|rate|amount)(?:\s+is)?|it'?s|that'?s)$/i;
// A line that adds the others up is not an item of its own.
const SUMMARY_LINE = /^\s*(?:(?:the\s+)?(?:grand\s+|sub)?total|altogether|in all)\b/i;
const NAMED_COMPANY = /^[^\n:(]{1,40}\(([^)\n]{2,60})\)\s*:/m;
// "50% now", "30% upfront", "20 % in advance" or "half now": a share asked for before delivery.
const UPFRONT =
  /\b(?:(\d{1,2}(?:\.\d+)?)\s?%|(half))\s+(?:now|upfront|up front|in advance|advance)\b/i;
const BILLED_TO = /\b(?:bill|invoice)\s+(?:to\s+)?([A-Z][\w&.' -]{2,40}?)(?=[,.\n]|\s+at\b|$)/;

function amountOf(match: RegExpExecArray): string {
  return (match[1] ?? match[2]).replaceAll(",", "");
}

function clauseBounds(text: string, start: number, end: number): [number, number] {
  const breaks = [...text.matchAll(CLAUSE_BREAK)].map((hit) => [
    hit.index,
    hit.index + hit[0].length,
  ]);
  const from = Math.max(
    0,
    ...breaks.filter(([, after]) => after <= start).map(([, after]) => after),
  );
  const to = Math.min(
    text.length,
    ...breaks.filter(([before]) => before >= end).map(([before]) => before),
  );
  return [from, to];
}

function capitalised(name: string): string {
  const clean = name
    .replace(/\s+/g, " ")
    .replace(/[\s.,:;?!]+$/, "")
    .trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function withoutConnectors(before: string): string {
  let words = before.replace(LEADING_FILLER, "").trim();
  for (let previous = ""; previous !== words;) {
    previous = words;
    words = words.replace(TRAILING_CONNECTOR, "").trim();
  }
  return NO_NAME.test(words) ? "" : words.split(" ").slice(-6).join(" ");
}

// "Brand book, $1,200" names the work before the comma that set the price apart.
function clauseBefore(text: string, from: number): string {
  const earlier = text.slice(0, from).split(new RegExp(CLAUSE_BREAK.source)).filter(Boolean);
  return withoutConnectors((earlier.at(-1) ?? "").replace(SPEAKER, ""));
}

// "Logos" asks for a number before "logo", so "3 logo options" gives the quantity.
function quantityNear(name: string, unit: string | undefined, rest: string): number {
  const stems = [name.split(" ")[0], unit ?? ""]
    .filter((word) => word.length >= 3)
    .map((word) => word.toLowerCase().slice(0, Math.max(3, word.length - 1)));
  for (const stem of stems) {
    const found = new RegExp(
      `\\b(\\d{1,3})\\s+(?!${MEASURES}\\b)(?:[a-z-]+\\s+){0,2}?${stem}`,
      "i",
    ).exec(rest);
    if (found) return Number(found[1]);
  }
  return 1;
}

function itemAt(text: string, match: RegExpExecArray): ModelItem | null {
  const start = match.index;
  const [from, to] = clauseBounds(text, start, start + match[0].length);
  const clause = text.slice(from, to).replace(SPEAKER, "");
  if (SUMMARY_LINE.test(clause)) return null;
  const priceAt = clause.indexOf(match[0]);
  const after = clause.slice(priceAt + match[0].length);
  const before = withoutConnectors(clause.slice(0, priceAt));
  const unitMatch = UNIT.exec(after);
  const unit = unitMatch?.[1] ?? unitMatch?.[2];
  const rest = text.slice(0, from) + text.slice(to);

  let name = before;
  let quantity = 1;
  const counted = /^(?:.*?\s)?(\d{1,3})\s+(.+)$/.exec(before);
  if (counted) {
    quantity = Number(counted[1]);
    name = counted[2];
  } else if (before) {
    quantity = quantityNear(before, unit, rest);
  } else {
    name =
      /^\s*for\s+(?:the\s+|a\s+|an\s+|our\s+)?(.+)$/i.exec(after)?.[1] ?? clauseBefore(text, from);
  }
  if (!name) return null;

  const quote = clause.replace(/[\s.,:;?!]+$/, "").trim();
  return { name: capitalised(name), quantity, unitAmount: amountOf(match), sourceQuote: quote };
}

interface ClientReading {
  name: string;
  contactName: string | null;
}

// The freelancer writes in the chat too, so a speaker who shares the freelancer's name, or its first
// word, is never the client.
function isFreelancer(person: string, freelancer: string): boolean {
  const own = freelancer.trim().toLowerCase();
  if (own === "") return false;
  const name = person.trim().toLowerCase();
  return name === own || name === own.split(/\s+/)[0];
}

function clientIn(text: string, freelancer: string): ClientReading {
  const company = speakersOf(text).find(
    (speaker) => speaker.company !== null && !isFreelancer(speaker.person, freelancer),
  );
  if (company?.company) return { name: company.company, contactName: company.person };
  const named = NAMED_COMPANY.exec(text)?.[1].trim() ?? BILLED_TO.exec(text)?.[1].trim() ?? "";
  return { name: named, contactName: null };
}

// The sentence around the match, so the notice can quote what the client wrote.
function sentenceAround(text: string, at: number, length: number): string {
  const start = Math.max(...[".", "?", "!", "\n"].map((mark) => text.lastIndexOf(mark, at))) + 1;
  const after = text.slice(at + length).search(/[.?!\n]/);
  const stop = after < 0 ? text.length : at + length + after + 1;
  return text.slice(start, stop).replace(SPEAKER, "").trim();
}

function paymentTermsIn(text: string): ModelDraft["paymentTerms"] {
  const found = UPFRONT.exec(text);
  if (!found) return null;
  const percent = found[2] ? 50 : Number(found[1]);
  return {
    upfrontPercent: percent,
    note: null,
    quote: sentenceAround(text, found.index, found[0].length),
  };
}

// Dueline's stand-in for the model when it runs offline. It reads the masked chat the same way the
// model would see it and returns the same shape, so every check in code still applies to it.
export function offlineModelDraft(rawMasked: string, today: string, freelancer = ""): ModelDraft {
  const masked = stripChatPrefixes(rawMasked);
  const items = [...masked.matchAll(PRICE)]
    .map((match) => itemAt(masked, match))
    .filter((item): item is ModelItem => item !== null);
  const currency = CURRENCIES.find(([marker]) => marker.test(masked))?.[1] ?? null;
  const purpose = PURPOSE_RULES.find(({ pattern }) => pattern.test(masked));

  const client = clientIn(masked, freelancer);

  return {
    clientName: client.name,
    clientContactName: client.contactName,
    clientEmail: /\[EMAIL_\d+\]/.exec(masked)?.[0] ?? null,
    clientCountry: null,
    countryQuote: null,
    currency,
    dueOn: dueDateIn(masked, today),
    items,
    note: null,
    purposeCode: purpose?.code ?? null,
    purposeReason: purpose?.reason ?? null,
    paymentTerms: paymentTermsIn(masked),
  };
}

import { addDays } from "@/lib/date-math";
import type { ModelDraft } from "./check-draft";

type ModelItem = ModelDraft["items"][number];

interface PurposeRule {
  pattern: RegExp;
  code: string;
  reason: string;
}

const PRICE =
  /(?:\b(?:USD|EUR|GBP|CAD|AUD)\s?|CA\$|A\$|C\$|[$€£])(\d[\d,]*(?:\.\d{1,2})?)|\b(\d[\d,]*(?:\.\d{1,2})?)\s?(?:USD|EUR|GBP|CAD|AUD)\b/g;

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

const CLAUSE_BREAK = /[.?!;]\s|\n|,\s/g;
const SPEAKER = /^[^:\n\d$€£]{1,40}:\s+/;
const LEADING_FILLER = /^(?:ok(?:ay)?|sure|so|and|then|yes|yeah|please|also)[\s,]+/i;
const TRAILING_CONNECTOR = /\s*(?:\b(?:for|at|is|are|only|just|about|x)\b|[@:=-])\s*$/i;
const UNIT = /^\s*(?:each\b|apiece\b|(?:an?|per)\s+([a-z]+)|\/\s*([a-z]+))/i;
// What comes before a price when nothing in it names the work: "I can pay", "the total is".
const NO_NAME =
  /^(?:(?:i|we|you|they)(?:'ll|'d)?\s+)?(?:(?:can|could|will|would|shall)\s+)?(?:pay|charge|do|offer|budget|bill|quote|(?:the\s+)?(?:total|price|fee|cost|budget|rate|amount)(?:\s+is)?|it'?s|that'?s)$/i;
const NAMED_COMPANY = /^[^\n:(]{1,40}\(([^)\n]{2,60})\)\s*:/m;
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
    const found = new RegExp(`\\b(\\d{1,3})\\s+(?:[a-z-]+\\s+){0,2}?${stem}`, "i").exec(rest);
    if (found) return Number(found[1]);
  }
  return 1;
}

function itemAt(text: string, match: RegExpExecArray): ModelItem | null {
  const start = match.index;
  const [from, to] = clauseBounds(text, start, start + match[0].length);
  const clause = text.slice(from, to).replace(SPEAKER, "");
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

function dueDateIn(text: string, today: string): string | null {
  const net = /\bnet\s?(\d{1,3})\b/i.exec(text);
  if (net) return addDays(today, Number(net[1]));
  const within =
    /\b(?:pay(?:ment)?|due|invoice)\b[^.\n]{0,30}\b(?:within|in)\s+(\d{1,3})\s+days\b/i.exec(text);
  if (within) return addDays(today, Number(within[1]));
  const stated =
    /\b(?:pay(?:ment)?\s+(?:is\s+)?(?:due|by)|due\s+(?:on|by)|pay\s+by)\s+(\d{4}-\d{2}-\d{2})\b/i.exec(
      text,
    );
  return stated?.[1] ?? null;
}

function clientIn(text: string): string {
  return NAMED_COMPANY.exec(text)?.[1].trim() ?? BILLED_TO.exec(text)?.[1].trim() ?? "";
}

// Dueline's stand-in for the model when it runs offline. It reads the masked chat the same way the
// model would see it and returns the same shape, so every check in code still applies to it.
export function offlineModelDraft(masked: string, today: string): ModelDraft {
  const items = [...masked.matchAll(PRICE)]
    .map((match) => itemAt(masked, match))
    .filter((item): item is ModelItem => item !== null);
  const currency = CURRENCIES.find(([marker]) => marker.test(masked))?.[1] ?? null;
  const purpose = PURPOSE_RULES.find(({ pattern }) => pattern.test(masked));

  return {
    clientName: clientIn(masked),
    clientEmail: /\[EMAIL_\d+\]/.exec(masked)?.[0] ?? null,
    clientCountry: null,
    countryQuote: null,
    currency,
    dueOn: dueDateIn(masked, today),
    items,
    note: null,
    purposeCode: purpose?.code ?? null,
    purposeReason: purpose?.reason ?? null,
  };
}

import { z } from "zod";
import { addDays } from "@/lib/clock";
import { isPurposeCode } from "@/lib/export/purpose-codes";
import { fromMinorUnits, toMinorUnits } from "@/lib/money/decimal";
import { unmask, type ContactMap } from "@/lib/privacy/mask";
import { currencySchema, type CurrencyCode, type InvoiceDraft, type LineItem } from "@/types";

export const modelDraftSchema = z.object({
  clientName: z.string(),
  clientEmail: z.string().nullable(),
  currency: z.string().nullable(),
  dueOn: z.string().nullable(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      unitAmount: z.string(),
      sourceQuote: z.string(),
    }),
  ),
  note: z.string().nullable(),
  purposeCode: z.string().nullable(),
  purposeReason: z.string().nullable(),
});

export type ModelDraft = z.infer<typeof modelDraftSchema>;

interface CheckInput {
  chat: string;
  contacts: ContactMap;
  today: string;
}

interface CheckedDraft {
  draft: InvoiceDraft;
  warnings: string[];
}

const DEFAULT_CURRENCY: CurrencyCode = "USD";
const DEFAULT_TERMS_DAYS = 14;
const MAX_ITEMS = 50;
const MAX_NAME_LENGTH = 200;
const MAX_QUOTE_LENGTH = 500;
const MAX_NOTE_LENGTH = 500;
const MAX_REASON_LENGTH = 300;

const DECIMAL_AMOUNT = /^\d+(\.\d{1,2})?$/;
const THOUSANDS_AMOUNT = /^\d{1,3}(,\d{3})+(\.\d+)?$/;
const CURRENCY_PREFIX = /^(?:USD|EUR|GBP|CAD|AUD|INR|[$€£₹])\s*/i;
const INSTRUCTION_PHRASES =
  /ignore\s+(?:all\s+|any\s+|the\s+)?(?:previous\s+|prior\s+|above\s+)?instructions|system\s+prompt|you\s+are\s+now|disregard\s+(?:the\s+|all\s+)?(?:above|previous|prior)/i;

function normalise(text: string): string {
  return text.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
}

// A quote may join separate lines of the chat with "...", so each piece must be in the chat.
function quoteIsInChat(quote: string, chat: string): boolean {
  const pieces = quote
    .split(/\.{3}|…/)
    .map(normalise)
    .filter((piece) => piece.length > 0);
  const haystack = normalise(chat);
  return pieces.length > 0 && pieces.every((piece) => haystack.includes(piece));
}

function normaliseAmount(raw: string): string | null {
  let value = raw.trim().replace(CURRENCY_PREFIX, "");
  if (THOUSANDS_AMOUNT.test(value)) value = value.replaceAll(",", "");
  if (!DECIMAL_AMOUNT.test(value)) return null;
  const minor = toMinorUnits(value);
  return minor > 0 ? fromMinorUnits(minor) : null;
}

// Compares as decimals, so "$1,200", "1200" and "1200.00" in a quote all match 1200.00.
function priceIsInQuote(unitAmount: string, quote: string): boolean {
  const numbers = quote.replace(/(\d),(?=\d{3})/g, "$1").match(/\d+(?:\.\d+)?/g) ?? [];
  return numbers.some((found) => normaliseAmount(found) === unitAmount);
}

function looksLikeInstructions(chat: string): boolean {
  return INSTRUCTION_PHRASES.test(chat);
}

function cleanText(raw: string | null, contacts: ContactMap, maxLength: number): string {
  return unmask(raw ?? "", contacts)
    .trim()
    .slice(0, maxLength);
}

function isQuantity(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 999;
}

function checkItems(
  raw: ModelDraft["items"],
  { chat, contacts }: CheckInput,
  warnings: string[],
): LineItem[] {
  if (raw.length > MAX_ITEMS) warnings.push(`Only the first ${MAX_ITEMS} items were kept`);

  const items: LineItem[] = [];
  for (const entry of raw.slice(0, MAX_ITEMS)) {
    const name = cleanText(entry.name, contacts, MAX_NAME_LENGTH);
    const label = name || "an item";

    if (!isQuantity(entry.quantity)) {
      warnings.push(`Dropped '${label}': the quantity must be a whole number from 1 to 999`);
      continue;
    }
    const unitAmount = normaliseAmount(entry.unitAmount);
    if (!name || unitAmount === null) {
      warnings.push(`Dropped '${label}': it needs a name and a price above zero`);
      continue;
    }

    const quote = unmask(entry.sourceQuote, contacts);
    if (!quoteIsInChat(quote, chat)) {
      warnings.push(`Check '${name}': not found word for word in the chat`);
    }
    if (!priceIsInQuote(unitAmount, quote)) {
      warnings.push(`Check the price of '${name}': it does not appear in the quoted words`);
    }
    items.push({
      name,
      quantity: entry.quantity,
      unitAmount,
      sourceQuote: quote.trim().slice(0, MAX_QUOTE_LENGTH),
      sac: null,
    });
  }
  return items;
}

function checkCurrency(raw: string | null, warnings: string[]): CurrencyCode {
  const parsed = currencySchema.safeParse((raw ?? "").trim().toUpperCase());
  if (parsed.success) return parsed.data;
  warnings.push("Currency not found, set to USD; check it");
  return DEFAULT_CURRENCY;
}

function checkDueOn(raw: string | null, today: string, warnings: string[]): string | null {
  const parsed = z.iso.date().safeParse((raw ?? "").trim());
  if (!parsed.success) {
    warnings.push(
      `No payment terms in the chat; due date set to ${DEFAULT_TERMS_DAYS} days from today. Change it if needed.`,
    );
    return addDays(today, DEFAULT_TERMS_DAYS);
  }
  if (parsed.data < today) {
    warnings.push("Due date is in the past");
    return null;
  }
  return parsed.data;
}

// The model only ever saw placeholders, so an address it returns that is not one of them is invented.
function checkEmail(raw: string | null, contacts: ContactMap, warnings: string[]): string {
  const restored = unmask((raw ?? "").trim(), contacts).toLowerCase();
  const known = contacts.emails.find((email) => email.toLowerCase() === restored);
  if (known && z.email().safeParse(known).success) return known;
  warnings.push("No client email found");
  return "";
}

// The reason is only kept for a code on our list, so it never explains a code that was dropped.
function checkPurpose(
  raw: ModelDraft,
  contacts: ContactMap,
): { purposeCode: string | null; purposeReason: string } {
  const suggested = raw.purposeCode?.trim() ?? "";
  if (!isPurposeCode(suggested)) return { purposeCode: null, purposeReason: "" };
  return {
    purposeCode: suggested,
    purposeReason: cleanText(raw.purposeReason, contacts, MAX_REASON_LENGTH),
  };
}

export function checkModelDraft(raw: ModelDraft, input: CheckInput): CheckedDraft {
  const warnings: string[] = [];
  const { contacts } = input;

  if (looksLikeInstructions(input.chat)) {
    warnings.push(
      "This chat contains text that looks like instructions to the AI. Check every item carefully.",
    );
  }

  const name = cleanText(raw.clientName, contacts, MAX_NAME_LENGTH);
  if (!name) warnings.push("No client name found");

  const items = checkItems(raw.items, input, warnings);
  const currency = checkCurrency(raw.currency, warnings);
  const dueOn = checkDueOn(raw.dueOn, input.today, warnings);
  const email = checkEmail(raw.clientEmail, contacts, warnings);

  const { purposeCode, purposeReason } = checkPurpose(raw, contacts);
  const note = cleanText(raw.note, contacts, MAX_NOTE_LENGTH);

  return {
    draft: {
      client: { name, email },
      currency,
      dueOn,
      items,
      ...(note ? { note } : {}),
      purposeCode,
      ...(purposeReason ? { purposeReason } : {}),
      includeLutNote: false,
    },
    warnings,
  };
}

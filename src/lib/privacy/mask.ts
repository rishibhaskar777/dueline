export interface ContactMap {
  emails: string[];
  phones: string[];
}

interface MaskedText extends ContactMap {
  masked: string;
}

const EMAIL = String.raw`[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}`;

// Dates and money are matched first and left alone, so their digits are never read as a phone
// number and a date cannot swallow the phone number written next to it.
const DATE = String.raw`\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b`;
const MONEY = String.raw`(?:[$€£₹]|\b(?:USD|EUR|GBP|CAD|AUD|INR|Rs\.?)\s?)\s?\d[\d,.]*|\b\d[\d,]*\.\d{1,2}\b`;

const PHONE = String.raw`(?<![\w$€£₹])\+?\(?\d[\d ()\-.\t]{5,}\d`;

const CONTACT = new RegExp(`(?<email>${EMAIL})|(?<skip>${DATE}|${MONEY})|(?<phone>${PHONE})`, "gi");

const MIN_PHONE_DIGITS = 8;
const MAX_PHONE_DIGITS = 15;

function digitCount(value: string): number {
  return value.replace(/\D/g, "").length;
}

function isPhoneNumber(candidate: string): boolean {
  const digits = digitCount(candidate);
  return digits >= MIN_PHONE_DIGITS && digits <= MAX_PHONE_DIGITS;
}

function placeholderFor(
  kind: "EMAIL" | "PHONE",
  key: string,
  value: string,
  seen: Map<string, number>,
  found: string[],
): string {
  let position = seen.get(key);
  if (position === undefined) {
    found.push(value);
    position = found.length;
    seen.set(key, position);
  }
  return `[${kind}_${position}]`;
}

export function maskContacts(text: string): MaskedText {
  const emails: string[] = [];
  const phones: string[] = [];
  const seenEmails = new Map<string, number>();
  const seenPhones = new Map<string, number>();

  let masked = "";
  let copiedUpTo = 0;
  for (const match of text.matchAll(CONTACT)) {
    const found = match[0];
    let replacement = found;
    if (match.groups?.email) {
      replacement = placeholderFor("EMAIL", found.toLowerCase(), found, seenEmails, emails);
    } else if (match.groups?.phone && isPhoneNumber(found)) {
      replacement = placeholderFor(
        "PHONE",
        found.replace(/[^\d+]/g, ""),
        found,
        seenPhones,
        phones,
      );
    }
    masked += text.slice(copiedUpTo, match.index) + replacement;
    copiedUpTo = match.index + found.length;
  }
  masked += text.slice(copiedUpTo);

  return { masked, emails, phones };
}

export function unmask(value: string, map: ContactMap): string {
  return value.replace(
    /\[(EMAIL|PHONE)_(\d+)\]/g,
    (placeholder, kind: string, position: string) => {
      const list = kind === "EMAIL" ? map.emails : map.phones;
      return list[Number(position) - 1] ?? placeholder;
    },
  );
}

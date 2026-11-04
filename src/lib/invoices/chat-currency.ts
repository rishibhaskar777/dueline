import type { CurrencyCode } from "@/types";

export interface CurrencyNotice {
  text: string;
  // The currency to offer as a one-click fix; absent for the rupees notice.
  suggest?: CurrencyCode;
}

interface Mentions {
  // Currencies the chat names without doubt: a code, a symbol such as € or C$, or a word like euros.
  named: Set<CurrencyCode>;
  // A bare $ or the word "dollars": USD, CAD or AUD.
  dollar: boolean;
  // A price or total written in rupees, such as ₹50,000 or 50000 INR, not just the word.
  rupeePrices: boolean;
}

const RUPEES_TEXT =
  "This chat mentions rupees. Export invoices through PayPal are billed in the client's currency.";
const MENTION_PREFIX = "The chat mentions ";

const SYMBOL: Record<CurrencyCode, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "C$",
  AUD: "A$",
};

// Checked in order on text with the matches already taken out, so "CA$" is never read as a bare "$".
const NAMED: [RegExp, CurrencyCode][] = [
  [/\bCA\$|\bC\$|\bCAD\b|\bcanadian dollars?\b/gi, "CAD"],
  [/\bAU\$|\bA\$|\bAUD\b|\baustralian dollars?\b/gi, "AUD"],
  [/\bUS\$|\bUSD\b|\bus dollars?\b|\bamerican dollars?\b/gi, "USD"],
  [/€|\bEUR\b|\beuros?\b/gi, "EUR"],
  [/£|\bGBP\b|\bpounds?\b|\bquid\b/gi, "GBP"],
];
const RUPEES = /₹|\bINR\b|\brupees?\b|\bRs\.?(?=\s*\d)/gi;
const RUPEE_PRICE = /(?:₹|\bINR\b|\bRs\.?)\s*\d|\d(?:[\d.,]*\d)?\s*k?\s*(?:₹|\bINR\b|\brupees?\b)/i;
const DOLLAR = /\$|\bdollars?\b|\bbucks\b/gi;

function mentionsIn(chat: string): Mentions {
  let rest = chat;
  const named = new Set<CurrencyCode>();
  for (const [pattern, code] of NAMED) {
    if (rest.match(pattern)) named.add(code);
    rest = rest.replace(pattern, " ");
  }
  const rupeePrices = RUPEE_PRICE.test(rest);
  rest = rest.replace(RUPEES, " ");
  return { named, dollar: rest.match(DOLLAR) !== null, rupeePrices };
}

// The client's country settles a bare "$" for Canada and Australia; everywhere else it is US dollars.
function dollarOf(country: string): CurrencyCode {
  if (country === "CA") return "CAD";
  if (country === "AU") return "AUD";
  return "USD";
}

function mismatch(
  label: string,
  currency: CurrencyCode,
  formCurrency: CurrencyCode,
): CurrencyNotice {
  return {
    text: `${MENTION_PREFIX}${label} but this invoice is in ${formCurrency}`,
    suggest: currency,
  };
}

// What the chat says about money, set against the currency on the form. Nothing here changes the
// form: each notice offers a fix for the user to click.
export function currencyNotices(
  chat: string,
  formCurrency: CurrencyCode,
  clientCountry = "",
): CurrencyNotice[] {
  const { named, dollar, rupeePrices } = mentionsIn(chat);
  const notices: CurrencyNotice[] = [];

  // A bare $ counts as a currency of its own only when nothing in the dollar family is named.
  const dollars: CurrencyCode[] = ["USD", "CAD", "AUD"];
  const dollarNamed = dollars.some((code) => named.has(code));
  const found = new Set(named);
  if (dollar && !dollarNamed) found.add(dollarOf(clientCountry));

  if (found.size === 1) {
    const [only] = [...found];
    const bareDollar = dollar && !dollarNamed;
    const sameFamily = dollars.includes(formCurrency) && bareDollar;
    // A chat that says "$" fits any dollar currency, so only a better guess is worth offering.
    if (only !== formCurrency && !(sameFamily && only === "USD")) {
      notices.push(mismatch(bareDollar ? "$" : SYMBOL[only], only, formCurrency));
    }
  }
  // A freelancer's chat often says "about ₹80k" beside the real price in euros or dollars, which is
  // no reason to warn; the warning is for a chat whose prices are in rupees.
  if (rupeePrices && found.size === 0) notices.push({ text: RUPEES_TEXT });
  return notices;
}

// True for the text of a notice above, so a warning written earlier is not shown beside the live one.
export function isCurrencyNoticeText(text: string): boolean {
  return text === RUPEES_TEXT || text.startsWith(MENTION_PREFIX);
}

import { isCurrencyNoticeText } from "@/lib/invoices/chat-currency";
import type { ExtractResponse, PaymentTerms } from "@/types";

export type NoticeTone = "green" | "amber";

export interface NoticePill {
  text: string;
  tone: NoticeTone;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

// Nothing is said when nothing was hidden; the paste step already explains the filter.
export function maskedNotice({ emails, phones }: ExtractResponse["masked"]): string | null {
  const hidden = [
    emails > 0 ? plural(emails, "email", "emails") : null,
    phones > 0 ? plural(phones, "phone number", "phone numbers") : null,
  ].filter((part): part is string => part !== null);
  return hidden.length === 0 ? null : `We hid ${hidden.join(" and ")} before the AI read the chat`;
}

const REST_ON_DELIVERY =
  /\b(rest|remaining|remainder|balance|other half|second half)\b.*\b(deliver\w*|completion|completed|finished|handover)\b/i;
const ADDS_A_TERM =
  /\bnet\s*\d|\d+\s*days?\b|approv|\binvoice\b|\d{1,2}(st|nd|rd|th)\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i;

// "The rest when you deliver" only says the other half of an upfront request; it adds nothing to it.
function restatesUpfront(note: string): boolean {
  return REST_ON_DELIVERY.test(note) && !ADDS_A_TERM.test(note);
}

// What the client asked for about paying, in their own words. The percentage is a notice: nothing
// on the invoice changes because of it.
function paymentTermPills(terms: PaymentTerms | null): NoticePill[] {
  if (!terms) return [];
  const pills: NoticePill[] = [];
  if (terms.upfrontPercent !== null) {
    pills.push({
      text: `Client asked for ${terms.upfrontPercent}% upfront, set below`,
      tone: "amber",
    });
  }
  if (terms.note !== null && !(terms.upfrontPercent !== null && restatesUpfront(terms.note))) {
    const words = terms.upfrontPercent === null ? ` (“${terms.quote}”)` : "";
    pills.push({ text: `Client's payment terms: ${terms.note}${words}`, tone: "amber" });
  }
  return pills;
}

// What the review step tells the user before the form: what the privacy filter hid (green), then
// what the client asked about payment and every note and warning from reading the chat (amber).
export function noticePills(
  notice: string | null,
  warnings: string[],
  paymentTerms: PaymentTerms | null = null,
): NoticePill[] {
  return [
    ...(notice ? [{ text: notice, tone: "green" as const }] : []),
    ...paymentTermPills(paymentTerms),
    // The currency warnings are drawn live above the form, where they offer a fix.
    ...warnings
      .filter((text) => !isCurrencyNoticeText(text))
      .map((text) => ({ text, tone: "amber" as const })),
  ];
}

export const NOTICE_CLASSES: Record<NoticeTone, string> = {
  green: "bg-tint-green text-paid",
  amber: "bg-tint-amber text-due-soon",
};

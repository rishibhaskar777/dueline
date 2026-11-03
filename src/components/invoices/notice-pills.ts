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

// What the client asked for about paying, in their own words. The percentage is a notice: nothing
// on the invoice changes because of it.
function paymentTermPills(terms: PaymentTerms | null): NoticePill[] {
  if (!terms) return [];
  const pills: NoticePill[] = [];
  if (terms.upfrontPercent !== null) {
    pills.push({
      text: `Client asked for ${terms.upfrontPercent}% upfront: “${terms.quote}”`,
      tone: "amber",
    });
  }
  if (terms.note !== null) {
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
    ...warnings.map((text) => ({ text, tone: "amber" as const })),
  ];
}

export const NOTICE_CLASSES: Record<NoticeTone, string> = {
  green: "bg-tint-green text-paid",
  amber: "bg-tint-amber text-due-soon",
};

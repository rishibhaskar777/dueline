import { maskContacts } from "@/lib/privacy/mask";
import type { InvoiceSummary, Money } from "@/types";

export interface ReminderFacts {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  work: string;
  amount: Money;
  issuedOn: string;
  dueOn: string;
  daysLate: number;
}

// The amount is what is still owed, which is less than the invoice total for a part-paid invoice.
export function factsOf(summary: InvoiceSummary, amountDue: Money): ReminderFacts {
  return {
    invoiceId: summary.id,
    invoiceNumber: summary.number,
    clientName: summary.client.name,
    work: summary.work,
    amount: amountDue,
    issuedOn: summary.issuedOn,
    dueOn: summary.dueOn,
    daysLate: summary.daysLate,
  };
}

// A client with no business name is shown by email address, which is neither written into a
// message nor sent to the model.
export function withoutContacts(text: string): string | null {
  const { emails, phones } = maskContacts(text);
  return emails.length + phones.length > 0 || text.trim() === "" ? null : text.trim();
}

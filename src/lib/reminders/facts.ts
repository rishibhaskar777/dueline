import { maskContacts } from "@/lib/privacy/mask";
import type { InvoiceSummary, Money } from "@/types";

export interface ReminderFacts {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  // The first name of the person at the client, for the greeting; null when there is none.
  contactName: string | null;
  work: string;
  amount: Money;
  issuedOn: string;
  dueOn: string;
  daysLate: number;
  // Reminders Dueline has already sent for this invoice.
  remindersSent: number;
}

// Only a first name is used to greet someone, and an email address is never a name.
export function firstNameOf(contactName: string | undefined): string | null {
  const name = withoutContacts(contactName ?? "");
  return name ? (name.split(/\s+/)[0] ?? null) : null;
}

// The amount is what is still owed, which is less than the invoice total for a part-paid invoice.
export function factsOf(
  summary: InvoiceSummary,
  amountDue: Money,
  remindersSent: number,
): ReminderFacts {
  return {
    invoiceId: summary.id,
    invoiceNumber: summary.number,
    clientName: summary.client.name,
    contactName: firstNameOf(summary.client.contactName),
    work: summary.work,
    amount: amountDue,
    issuedOn: summary.issuedOn,
    dueOn: summary.dueOn,
    daysLate: summary.daysLate,
    remindersSent,
  };
}

// A client with no business name is shown by email address, which is neither written into a
// message nor sent to the model.
export function withoutContacts(text: string): string | null {
  const { emails, phones } = maskContacts(text);
  return emails.length + phones.length > 0 || text.trim() === "" ? null : text.trim();
}

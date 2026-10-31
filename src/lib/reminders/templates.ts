import { formatDate } from "@/lib/format-date";
import type { Tone } from "@/types";
import type { ReminderText } from "./check-reminder";
import { withoutContacts, type ReminderFacts } from "./facts";

function days(count: number): string {
  return `${count} ${count === 1 ? "day" : "days"}`;
}

// Used when the model is not available, so every part is fixed wording filled with the facts. The
// sign-off is added afterwards.
export function templateReminder(facts: ReminderFacts, tone: Tone): ReminderText {
  const { invoiceNumber, daysLate } = facts;
  const owed = `${facts.amount.currency} ${facts.amount.value}`;
  const work = withoutContacts(facts.work);
  const invoice = `invoice ${invoiceNumber} for ${owed}${work ? ` (${work})` : ""}`;
  const due = `was due on ${formatDate(facts.dueOn)}`;
  const name = withoutContacts(facts.clientName);
  const greeting = name ? `Hi ${name} team,` : "Hi there,";

  switch (tone) {
    case "gentle":
      return {
        subject: `A quick reminder about invoice ${invoiceNumber}`,
        message: `${greeting}\n\nA quick reminder that ${invoice} ${due} and is now ${days(daysLate)} overdue. If you have already paid, please ignore this note.\n\nThe PayPal email has a Pay now button that takes you straight to the payment. Please let me know if anything is unclear.`,
      };
    case "firm":
      return {
        subject: `Invoice ${invoiceNumber} is now ${days(daysLate)} overdue`,
        message: `${greeting}\n\nI am following up on ${invoice}. It ${due} and is now ${days(daysLate)} overdue, and I have not yet seen a payment.\n\nCould you please pay it this week using the Pay now button in the PayPal email? If something is holding it up, let me know and I will help sort it out.`,
      };
    case "final":
      return {
        subject: `Final reminder: invoice ${invoiceNumber}`,
        message: `${greeting}\n\nThis is my final reminder about ${invoice}. It ${due} and is now ${days(daysLate)} overdue.\n\nPlease pay it within the next 3 days using the Pay now button in the PayPal email, or reply with the date you expect to pay.`,
      };
  }
}

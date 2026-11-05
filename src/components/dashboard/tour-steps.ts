import { addMonths } from "@/lib/date-math";
import { clientKey } from "@/lib/risk/client-key";
import type { InvoiceSummary } from "@/types";

export interface TourStep {
  title: string;
  text: string;
  // The place the step is about.
  href: string;
}

// What the links depend on: the day, the invoices on Home, and whether a balance is waiting there.
export interface TourContext {
  today: string;
  invoices: InvoiceSummary[];
  hasReadyToSend: boolean;
}

// The late client who is furthest behind, whoever that is in the data being shown.
function mostLateClientKey(invoices: InvoiceSummary[]): string | null {
  const late = invoices.filter(({ dueState, paidOn }) => dueState === "overdue" && paidOn === null);
  const [worst] = late.sort((a, b) => b.daysLate - a.daysLate);
  return worst ? clientKey(worst.client.name) : null;
}

// The wording is the README's "two-minute path through every feature"; a test keeps the two equal.
export function tourSteps({ today, invoices, hasReadyToSend }: TourContext): TourStep[] {
  const lateClient = mostLateClientKey(invoices);
  return [
    {
      title: "Home.",
      text: "Each invoice is a line from the day it was sent to the day it was paid. Late ones turn red.",
      href: "/receivables#due-line-title",
    },
    {
      title: "Clients behind.",
      text: "Open a late client to see how often they paid late and the tone Dueline suggests.",
      href: lateClient ? `/clients/by-key/${lateClient}` : "/clients",
    },
    {
      title: "New invoice → Use a sample chat → Draft invoice.",
      text: "Every line quotes the chat, and the summary shows the rupees that reach the bank.",
      href: "/invoices/new?sample=1",
    },
    {
      title: "Deposit and balance.",
      text: 'The sample chat asks for 50% upfront, so the form offers it: "Create deposit and save balance" sends the deposit and keeps the balance in Ready to send on Home, where "Send balance" sends it.',
      // Ready to send only exists once a balance is saved, so until then the form is the place.
      href: hasReadyToSend ? "/receivables#ready-title" : "/invoices/new?sample=1",
    },
    {
      title: "Nudges.",
      text: "Switch Gentle, Firm and Final, then Preview. Nothing is sent until you press a button.",
      href: "/nudges",
    },
    {
      title: "Export register.",
      text: "Go to the previous month and download the CSV for a CA.",
      href: `/export?month=${addMonths(today.slice(0, 7), -1)}`,
    },
    {
      title: "Account menu → Fees and rates.",
      text: "What a $1,000 invoice really pays after PayPal's fee and conversion.",
      href: "/settings",
    },
    {
      title: "Account menu → Demo tools → Reset the demo.",
      text: "Rebuilds the story with dates counted back from today.",
      href: "/demo-tools",
    },
  ];
}

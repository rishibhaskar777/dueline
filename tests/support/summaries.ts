import type { Client, InvoiceSummary } from "@/types";

export const OKAFOR: Client = { name: "Okafor & Reyes", email: "buyer@personal.example.com" };
export const BRIGHTWELL: Client = { name: "Brightwell Labs", email: "buyer@personal.example.com" };

let counter = 0;

function base(client: Client, dueOn: string): InvoiceSummary {
  counter += 1;
  return {
    id: `INV2-TEST-${counter}`,
    number: `INV-${String(counter).padStart(4, "0")}`,
    client,
    work: "Brand guidelines",
    amount: { currency: "EUR", value: "720.00" },
    issuedOn: "2026-08-01",
    dueOn,
    paidOn: null,
    paypalStatus: "UNPAID",
    dueState: "on_time",
    daysLate: 0,
    payoutInr: null,
    payoutSource: null,
    rateDate: null,
    actualPayout: null,
    purposeCode: "P1099",
    payLink: "https://www.sandbox.paypal.com/invoice/p/#TEST",
    riskLevel: null,
  };
}

export function paidInvoice(
  dueOn: string,
  paidOn: string,
  client: Client = OKAFOR,
): InvoiceSummary {
  return { ...base(client, dueOn), paypalStatus: "PAID", dueState: "paid", paidOn };
}

export function overdueInvoice(
  dueOn: string,
  daysLate: number,
  client: Client = OKAFOR,
): InvoiceSummary {
  return { ...base(client, dueOn), dueState: "overdue", daysLate };
}

export function openInvoice(dueOn: string, client: Client = OKAFOR): InvoiceSummary {
  return base(client, dueOn);
}

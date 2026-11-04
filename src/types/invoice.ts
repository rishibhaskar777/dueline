import type { CurrencyCode, Money } from "./money";
import type { PaymentPromise } from "./promise";
import type { RiskLevel } from "./risk";

export type DueState = "paid" | "on_time" | "due_soon" | "overdue";

// paypal: PayPal reported the rupees. estimate: worked out from PayPal's net or the published fees at
// an ECB rate. outside_paypal: the payment was made elsewhere, so no PayPal fee or markup applies.
export type PayoutSource = "paypal" | "estimate" | "outside_paypal";

export interface Client {
  name: string;
  email: string;
  country?: string;
  contactName?: string; // the person at the client, kept as the recipient's name on the PayPal invoice
}

export interface ActualPayout {
  fee: Money;
  net: Money;
  exchangeRate: number | null;
  netInr: number | null;
  source: "paypal_capture" | "invoice_payment";
  paidAt: string | null;
  transactionId: string;
}

export interface InvoiceSummary {
  id: string;
  number: string;
  client: Client;
  work: string;
  amount: Money;
  issuedOn: string;
  dueOn: string;
  paidOn: string | null;
  paypalStatus: string;
  dueState: DueState;
  daysLate: number;
  payoutInr: number | null;
  payoutSource: PayoutSource | null;
  rateDate: string | null;
  actualPayout: ActualPayout | null;
  purposeCode: string | null;
  payLink: string;
  riskLevel: RiskLevel | null;
  promise?: PaymentPromise; // the date the client promised to pay by, while the invoice is unpaid
  mergedFrom?: string; // set when the client was merged into another: the name on the PayPal invoice
}

export interface Totals {
  outstandingInr: number;
  overdueInr: number;
  overdueCount: number;
  paidLast30Inr: number;
  paidLast30PayPalInr: number;
  paidLast30OutsideInr: number;
}

export interface LineItem {
  name: string;
  quantity: number;
  unitAmount: string;
  sourceQuote?: string;
  sac: string | null;
}

// What the chat said about when the client pays, shown on the review step as a notice only.
export interface PaymentTerms {
  upfrontPercent: number | null; // 1 to 99: the share of the total the client asked to pay before delivery
  note: string | null; // any other term the client wrote, like "net 30" or "after approval"
  quote: string; // the exact words from the chat
}

export interface InvoiceDraft {
  client: Client;
  currency: CurrencyCode;
  dueOn: string | null;
  items: LineItem[];
  note?: string;
  purposeCode: string | null;
  purposeReason?: string;
  includeLutNote: boolean;
}

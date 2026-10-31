import type { CurrencyCode, Money } from "./money";
import type { RiskLevel } from "./risk";

export type DueState = "paid" | "on_time" | "due_soon" | "overdue";

// paypal: PayPal reported the rupees. estimate: worked out from PayPal's net or the published fees at
// an ECB rate. outside_paypal: the payment was made elsewhere, so no PayPal fee or markup applies.
export type PayoutSource = "paypal" | "estimate" | "outside_paypal";

export interface Client {
  name: string;
  email: string;
  location?: string;
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
}

export interface Totals {
  outstandingInr: number;
  overdueInr: number;
  overdueCount: number;
  paidThisMonthPayPalInr: number;
  paidThisMonthOutsideInr: number;
}

export interface LineItem {
  name: string;
  quantity: number;
  unitAmount: string;
  sourceQuote?: string;
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

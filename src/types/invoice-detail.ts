import type { PaySpeed } from "./insights";
import type { InvoiceSummary } from "./invoice";
import type { Money } from "./money";
import type { ReminderChannel, Tone } from "./reminder";

export type TimelineKind =
  "created" | "sent" | "reminder" | "viewed" | "due" | "overdue" | "paid" | "cancelled";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  at: string;
  tone?: Tone;
  channel?: ReminderChannel; // reminders
  via?: "paypal" | "outside_paypal";
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitAmount: Money;
  sac: string | null;
}

export interface InvoiceDetails {
  clientKey: string;
  clientPaySpeed: PaySpeed | null;
  items: InvoiceItem[];
  note: string;
  underLut: boolean;
  hiddenFromDemo: boolean;
  actions: { remind: boolean; recordPayment: boolean; cancel: boolean };
}

export type PaymentMethod = "BANK_TRANSFER" | "WIRE_TRANSFER" | "OTHER";

export interface InvoiceDetailResponse {
  invoice: InvoiceSummary;
  timeline: TimelineEvent[];
  reminders: { tone: Tone; sentAt: string; channel: ReminderChannel }[];
  details: InvoiceDetails;
}

export interface CancelInvoiceResponse {
  cancelled: true;
  notified: boolean;
}

export interface RecordPaymentResponse {
  recorded: true;
  paidOn: string;
}

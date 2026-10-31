import type { ActivityEvent } from "./activity";
import type { InvoiceDraft, InvoiceSummary, Totals } from "./invoice";
import type { PurposeCode } from "./export";
import type { ReminderDraft } from "./reminder";
import type { ClientRisk } from "./risk";

export interface InvoicesResponse {
  invoices: InvoiceSummary[];
  totals: Totals;
}

export interface ExtractResponse {
  draft: InvoiceDraft;
  warnings: string[];
  risk: ClientRisk | null;
  masked: { emails: number; phones: number };
}

export interface CreateInvoiceResponse {
  invoice: InvoiceSummary;
  sent: boolean;
}

export interface SendInvoiceResponse {
  invoice: InvoiceSummary;
  sent: true;
}

export interface PurposeCodesResponse {
  codes: PurposeCode[];
}

export interface DemoRecipientResponse {
  email: string;
}

export interface DemoResetResponse {
  cancelled: number;
  deleted: number;
  created: number;
  skipped: number;
  failed: number;
}

export interface RemindersResponse {
  drafts: ReminderDraft[];
}

export interface SendReminderResponse {
  sentAt: string;
}

export interface ActivityResponse {
  events: ActivityEvent[];
}

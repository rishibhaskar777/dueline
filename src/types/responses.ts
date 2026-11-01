import type { LibraryItem, QueueItem, RepeatSchedule, TriggeredRateAlert } from "./automation";
import type { ClientSummary } from "./clients";
import type { ActivityEvent } from "./activity";
import type { InvoiceDraft, InvoiceSummary, Totals } from "./invoice";
import type { PurposeCode } from "./export";
import type { ReminderDraft, ReminderLanguage } from "./reminder";
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
  kept: number;
}

export interface RemindersResponse {
  drafts: ReminderDraft[];
  remindersLeftToday: number;
}

export interface SendReminderResponse {
  sentAt: string;
}

export interface ActivityResponse {
  events: ActivityEvent[];
}

export interface ClientsResponse {
  clients: ClientSummary[];
}

export interface ClientNotesResponse {
  notes: string;
}

export interface QueueResponse {
  items: QueueItem[];
}

export interface DismissQueueResponse {
  dismissed: true;
}

export interface RepeatsResponse {
  repeats: RepeatSchedule[];
}

export interface LibraryItemsResponse {
  items: LibraryItem[];
}

export interface RateAlertsResponse {
  alerts: TriggeredRateAlert[];
}

export interface ClientLanguageResponse {
  language: ReminderLanguage;
}

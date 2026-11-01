import type { CurrencyCode, Money } from "./money";

export type RateDirection = "above" | "below";

export interface RateAlert {
  currency: CurrencyCode;
  direction: RateDirection;
  threshold: number;
}

export interface TriggeredRateAlert extends RateAlert {
  rate: number;
}

export type QueueKind = "reminder" | "repeat";

export interface QueueItem {
  id: string;
  kind: QueueKind;
  title: string;
  detail: string;
  invoiceId: string | null;
  repeatId: string | null;
}

export interface DigestInvoice {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  amount: Money;
}

export interface DailyDigest {
  day: string;
  paidSinceYesterday: DigestInvoice[];
  newlyOverdue: DigestInvoice[];
  dueSoon: DigestInvoice[];
  preparedDrafts: number;
  rateAlerts: TriggeredRateAlert[];
}

export interface RepeatItem {
  name: string;
  quantity: number;
  unitAmount: string;
  sac: string | null;
}

export interface RepeatSchedule {
  id: string;
  clientKey: string;
  clientName: string;
  clientEmail: string;
  currency: CurrencyCode;
  items: RepeatItem[];
  purposeCode: string | null;
  includeLutNote: boolean;
  dayOfMonth: number;
  nextOn: string;
  paused: boolean;
}

export interface LibraryItem {
  id: string;
  name: string;
  unitAmount: string;
  currency: CurrencyCode;
  sac: string | null;
}

export interface DailyRunResponse {
  ran: boolean;
  digest: DailyDigest;
}

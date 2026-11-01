import type { ReminderLanguage } from "./reminder";
import type { PaySpeed } from "./insights";
import type { InvoiceSummary } from "./invoice";
import type { ClientRisk, RiskLevel } from "./risk";

export interface ClientSummary {
  key: string;
  name: string;
  email: string;
  country: string | null;
  paySpeed: PaySpeed | null;
  riskLevel: RiskLevel | null;
  riskReason: string;
  invoices: number;
  billedInr: number;
  outstandingInr: number;
  averageDaysLate: number;
  lastPaidOn: string | null;
}

// A client merged into another: its invoices count as the other client's in Dueline's views.
export interface MergedClient {
  key: string;
  name: string;
  email: string;
}

export interface ClientDetail {
  client: ClientSummary;
  invoices: InvoiceSummary[];
  risk: ClientRisk;
  notes: string;
  language: ReminderLanguage;
  merged: MergedClient[]; // the clients merged into this one, oldest merge first
}

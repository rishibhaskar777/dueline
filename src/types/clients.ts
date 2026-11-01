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

export interface ClientDetail {
  client: ClientSummary;
  invoices: InvoiceSummary[];
  risk: ClientRisk;
  notes: string;
  language: ReminderLanguage;
}

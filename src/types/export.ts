import type { Money } from "./money";

export interface PurposeCode {
  code: string;
  label: string;
  examples: string;
}

export interface ExportRegisterRow {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  clientCountry: string | null;
  paidOn: string;
  foreign: Money;
  inrReceived: number;
  inrSource: "paypal" | "estimate";
  purposeCode: string | null;
}

export interface ExportRegister {
  month: string;
  rows: ExportRegisterRow[];
  totalInr: number;
}

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
  fee: Money | null;
  net: Money | null;
  inrReceived: number;
  inrSource: "paypal" | "estimate";
  rateUsed: number | null;
  rateDate: string | null;
  purposeCode: string | null;
  underLut: boolean;
  transactionId: string | null;
}

export interface ExportRegister {
  month: string;
  rows: ExportRegisterRow[];
  totalInr: number;
  totalsByCurrency: Money[];
  paypalInr: number;
  estimatedInr: number;
  missingPurposeCodes: number;
  recordedOutsidePayPal: string[];
}

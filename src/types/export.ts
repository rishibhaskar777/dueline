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
  sac: string | null;
  underLut: boolean;
  transactionId: string | null;
}

export type ExportOutsideRow = Omit<ExportRegisterRow, "fee" | "net" | "transactionId"> & {
  bankReference: string | null;
};

export interface ExportRegister {
  month: string;
  latestMonthWithPayments: string | null;
  rows: ExportRegisterRow[];
  outsideRows: ExportOutsideRow[];
  totalInr: number;
  paypalFiraInr: number;
  bankInr: number;
  totalsByCurrency: Money[];
  paypalInr: number;
  estimatedInr: number;
  missingPurposeCodes: number;
}

export interface AnnualSummary {
  fy: string;
  from: string;
  to: string;
  receivedPayPalInr: number;
  receivedOutsideInr: number;
  paypalFeesInr: number;
  conversionLossInr: number;
  grossReceiptsInr: number;
  presumptiveIncomeInr: number;
  presumptiveLimitInr: number;
  overLimit: boolean;
  invoiceCount: number;
  clientCount: number;
}

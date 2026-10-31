export type RiskLevel = "reliable" | "watch" | "late_payer";

export interface ClientRisk {
  clientEmail: string;
  clientName: string;
  invoicesConsidered: number;
  lateCount: number;
  averageDaysLate: number;
  level: RiskLevel;
  suggestion: { kind: "early_payment_discount"; percent: number; withinDays: number } | null;
  reason: string;
}

import type { Money } from "./money";

export type ActivityKind =
  | "paid"
  | "viewed"
  | "sent"
  | "overdue"
  | "reminder_sent"
  | "email_sent"
  | "heads_up_sent"
  | "promised";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  at: string;
  amount?: Money;
  detail?: string; // a promised event: the date, YYYY-MM-DD
}

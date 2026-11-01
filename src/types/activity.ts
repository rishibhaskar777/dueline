import type { Money } from "./money";

export type ActivityKind = "paid" | "viewed" | "sent" | "overdue" | "reminder_sent" | "email_sent";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  at: string;
  amount?: Money;
}

import type { ActivityEvent, ActualPayout, CurrencyCode, Settings, Tone } from "@/types";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type ClaimResult =
  | { kind: "new" }
  | { kind: "replay"; result: Json }
  | { kind: "conflict" }
  | { kind: "in_progress" };

export interface ReminderLogEntry {
  invoiceId: string;
  tone: Tone;
  sentAt: string;
}

export interface Store {
  claim(requestId: string, bodyHash: string): Promise<ClaimResult>;
  complete(requestId: string, result: Json): Promise<void>;

  markProcessed(eventId: string): Promise<boolean>;

  addActivity(event: ActivityEvent): Promise<void>;
  latestActivity(limit: number): Promise<ActivityEvent[]>;

  logReminder(entry: ReminderLogEntry): Promise<void>;
  reminderHistory(invoiceId: string): Promise<ReminderLogEntry[]>;

  getSettings(): Promise<Settings | null>;
  saveSettings(settings: Settings): Promise<void>;

  hitRateLimit(key: string, windowSeconds: number): Promise<number>;

  getRate(currency: CurrencyCode, onDate: string): Promise<number | null>;
  putRate(currency: CurrencyCode, onDate: string, rate: number): Promise<void>;

  getActualPayout(invoiceId: string): Promise<ActualPayout | null>;
  putActualPayout(invoiceId: string, payout: ActualPayout): Promise<void>;

  ping(): Promise<void>;
}

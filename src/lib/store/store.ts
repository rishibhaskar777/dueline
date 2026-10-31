import type { ActivityEvent, ActualPayout, CurrencyCode, Profile, Settings, Tone } from "@/types";

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

export interface StoredRates {
  rates: Record<CurrencyCode, number>;
  onDate: string; // date the rates are for, as published by the ECB
  fetchedOn: string; // day Dueline fetched them
}

export interface Store {
  claim(requestId: string, bodyHash: string): Promise<ClaimResult>;
  complete(requestId: string, result: Json): Promise<void>;
  // Gives up a claim that is still in progress, so the request ID can be claimed again. With
  // `olderThanMs` it only does so for a claim at least that old, which lets one caller take over a
  // request that was abandoned. A completed request is never released. Returns whether it released.
  release(requestId: string, olderThanMs?: number): Promise<boolean>;

  isProcessed(eventId: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<boolean>;

  addActivity(event: ActivityEvent): Promise<void>;
  latestActivity(limit: number): Promise<ActivityEvent[]>;

  logReminder(entry: ReminderLogEntry): Promise<void>;
  reminderHistory(invoiceId: string): Promise<ReminderLogEntry[]>;
  // Reminders sent for any invoice at or after this ISO timestamp.
  countRemindersSince(since: string): Promise<number>;

  getSettings(): Promise<Settings | null>;
  saveSettings(settings: Settings): Promise<void>;

  getProfile(): Promise<Profile | null>;
  saveProfile(profile: Profile): Promise<void>;

  hitRateLimit(key: string, windowSeconds: number): Promise<number>;

  getCached(key: string): Promise<Json | null>;
  putCached(key: string, value: Json, ttlSeconds: number): Promise<void>;

  getLatestRates(): Promise<StoredRates | null>;
  putRates(stored: StoredRates): Promise<void>;

  getActualPayout(invoiceId: string): Promise<ActualPayout | null>;
  putActualPayout(invoiceId: string, payout: ActualPayout): Promise<void>;

  ping(): Promise<void>;
}

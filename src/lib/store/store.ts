import type {
  ActivityEvent,
  ActualPayout,
  CurrencyCode,
  LibraryItem,
  Profile,
  QueueItem,
  QueueKind,
  ReminderLanguage,
  RepeatSchedule,
  Settings,
  Tone,
} from "@/types";

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

  // Private notes about a client, "" when there are none. Never logged.
  getClientNotes(clientKey: string): Promise<string>;
  saveClientNotes(clientKey: string, notes: string): Promise<void>;

  // The language reminders to this client are written in; English until one is saved.
  getClientLanguage(clientKey: string): Promise<ReminderLanguage>;
  saveClientLanguage(clientKey: string, language: ReminderLanguage): Promise<void>;

  // Queue items stay until they are removed. An item whose ID is already there is not added twice.
  addQueueItem(item: QueueItem): Promise<boolean>;
  // Swaps every item of one kind for the given ones, so a daily run can refresh what is overdue.
  replaceQueueItems(kind: QueueKind, items: QueueItem[]): Promise<void>;
  // All items, in the order they were added.
  listQueue(): Promise<QueueItem[]>;
  removeQueueItem(id: string): Promise<boolean>;

  listRepeats(): Promise<RepeatSchedule[]>;
  saveRepeat(repeat: RepeatSchedule): Promise<void>;
  deleteRepeat(id: string): Promise<boolean>;

  listLibraryItems(): Promise<LibraryItem[]>;
  saveLibraryItem(item: LibraryItem): Promise<void>;
  deleteLibraryItem(id: string): Promise<boolean>;

  hitRateLimit(key: string, windowSeconds: number): Promise<number>;

  getCached(key: string): Promise<Json | null>;
  putCached(key: string, value: Json, ttlSeconds: number): Promise<void>;

  getLatestRates(): Promise<StoredRates | null>;
  putRates(stored: StoredRates): Promise<void>;

  getActualPayout(invoiceId: string): Promise<ActualPayout | null>;
  putActualPayout(invoiceId: string, payout: ActualPayout): Promise<void>;

  ping(): Promise<void>;
}

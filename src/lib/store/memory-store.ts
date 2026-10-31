import type { ActivityEvent, ActualPayout, Profile, Settings } from "@/types";
import type { ClaimResult, Json, ReminderLogEntry, Store, StoredRates } from "./store";

interface IdempotencyRecord {
  bodyHash: string;
  claimedAt: number;
  result?: Json;
}

export function createMemoryStore(): Store {
  const requests = new Map<string, IdempotencyRecord>();
  const events = new Set<string>();
  const activity = new Map<string, ActivityEvent>();
  const reminders: ReminderLogEntry[] = [];
  const rateLimits = new Map<string, { count: number; resetsAt: number }>();
  const cache = new Map<string, { value: Json; expiresAt: number }>();
  let rates: StoredRates | null = null;
  const payouts = new Map<string, ActualPayout>();
  let settings: Settings | null = null;
  let profile: Profile | null = null;
  const clientNotes = new Map<string, string>();

  return {
    async claim(requestId, bodyHash): Promise<ClaimResult> {
      const existing = requests.get(requestId);
      if (!existing) {
        requests.set(requestId, { bodyHash, claimedAt: Date.now() });
        return { kind: "new" };
      }
      if (existing.bodyHash !== bodyHash) return { kind: "conflict" };
      return existing.result === undefined
        ? { kind: "in_progress" }
        : { kind: "replay", result: existing.result };
    },

    async complete(requestId, result): Promise<void> {
      const existing = requests.get(requestId);
      if (existing) existing.result = result;
    },

    async release(requestId, olderThanMs = 0): Promise<boolean> {
      const existing = requests.get(requestId);
      if (!existing || existing.result !== undefined) return false;
      if (Date.now() - existing.claimedAt < olderThanMs) return false;
      requests.delete(requestId);
      return true;
    },

    async isProcessed(eventId): Promise<boolean> {
      return events.has(eventId);
    },

    async markProcessed(eventId): Promise<boolean> {
      if (events.has(eventId)) return false;
      events.add(eventId);
      return true;
    },

    async addActivity(event): Promise<void> {
      activity.set(event.id, event);
    },

    async latestActivity(limit): Promise<ActivityEvent[]> {
      return [...activity.values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
    },

    async logReminder(entry): Promise<void> {
      reminders.push(entry);
    },

    async reminderHistory(invoiceId): Promise<ReminderLogEntry[]> {
      return reminders.filter((entry) => entry.invoiceId === invoiceId);
    },

    async countRemindersSince(since): Promise<number> {
      return reminders.filter((entry) => Date.parse(entry.sentAt) >= Date.parse(since)).length;
    },

    async getSettings(): Promise<Settings | null> {
      return settings;
    },

    async saveSettings(next): Promise<void> {
      settings = next;
    },

    async getProfile(): Promise<Profile | null> {
      return profile;
    },

    async saveProfile(next): Promise<void> {
      profile = next;
    },

    async getClientNotes(clientKey): Promise<string> {
      return clientNotes.get(clientKey) ?? "";
    },

    async saveClientNotes(clientKey, notes): Promise<void> {
      clientNotes.set(clientKey, notes);
    },

    async hitRateLimit(key, windowSeconds): Promise<number> {
      const now = Date.now();
      const current = rateLimits.get(key);
      const entry =
        current && now < current.resetsAt
          ? current
          : { count: 0, resetsAt: now + windowSeconds * 1000 };
      entry.count += 1;
      rateLimits.set(key, entry);
      return entry.count;
    },

    async getCached(key): Promise<Json | null> {
      const entry = cache.get(key);
      if (!entry) return null;
      if (Date.now() >= entry.expiresAt) {
        cache.delete(key);
        return null;
      }
      return entry.value;
    },

    async putCached(key, value, ttlSeconds): Promise<void> {
      cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    },

    async getLatestRates(): Promise<StoredRates | null> {
      return rates;
    },

    async putRates(stored): Promise<void> {
      rates = stored;
    },

    async getActualPayout(invoiceId): Promise<ActualPayout | null> {
      return payouts.get(invoiceId) ?? null;
    },

    async putActualPayout(invoiceId, payout): Promise<void> {
      payouts.set(invoiceId, payout);
    },

    async ping(): Promise<void> {},
  };
}

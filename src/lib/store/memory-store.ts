import type { ActivityEvent, ActualPayout, Settings } from "@/types";
import type { ClaimResult, Json, ReminderLogEntry, Store } from "./store";

interface IdempotencyRecord {
  bodyHash: string;
  result?: Json;
}

export function createMemoryStore(): Store {
  const requests = new Map<string, IdempotencyRecord>();
  const events = new Set<string>();
  const activity = new Map<string, ActivityEvent>();
  const reminders: ReminderLogEntry[] = [];
  const rateLimits = new Map<string, { count: number; resetsAt: number }>();
  const rates = new Map<string, number>();
  const payouts = new Map<string, ActualPayout>();
  let settings: Settings | null = null;

  return {
    async claim(requestId, bodyHash): Promise<ClaimResult> {
      const existing = requests.get(requestId);
      if (!existing) {
        requests.set(requestId, { bodyHash });
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

    async getSettings(): Promise<Settings | null> {
      return settings;
    },

    async saveSettings(next): Promise<void> {
      settings = next;
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

    async getRate(currency, onDate): Promise<number | null> {
      return rates.get(`${currency}:${onDate}`) ?? null;
    },

    async putRate(currency, onDate, rate): Promise<void> {
      rates.set(`${currency}:${onDate}`, rate);
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

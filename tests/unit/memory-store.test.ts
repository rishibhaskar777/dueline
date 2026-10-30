import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { settings } from "@/mocks/fixtures";
import type { ActivityEvent, ActualPayout } from "@/types";

let store: Store;

beforeEach(() => {
  store = createMemoryStore();
});

describe("idempotency", () => {
  it("accepts a new request, then reports it in progress", async () => {
    expect(await store.claim("req-1", "hash-a")).toEqual({ kind: "new" });
    expect(await store.claim("req-1", "hash-a")).toEqual({ kind: "in_progress" });
  });

  it("replays the stored result once the request is complete", async () => {
    await store.claim("req-1", "hash-a");
    await store.complete("req-1", { invoiceId: "INV2-1", sent: true });
    expect(await store.claim("req-1", "hash-a")).toEqual({
      kind: "replay",
      result: { invoiceId: "INV2-1", sent: true },
    });
  });

  it("reports a conflict when the same request id carries a different body", async () => {
    await store.claim("req-1", "hash-a");
    expect(await store.claim("req-1", "hash-b")).toEqual({ kind: "conflict" });
  });

  describe("releasing a claim", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-30T00:00:00Z"));
    });

    afterEach(() => vi.useRealTimers());

    it("frees a request in progress so it can be claimed again, even with another body", async () => {
      await store.claim("req-1", "hash-a");
      expect(await store.release("req-1")).toBe(true);
      expect(await store.claim("req-1", "hash-b")).toEqual({ kind: "new" });
    });

    it("never releases a completed request", async () => {
      await store.claim("req-1", "hash-a");
      await store.complete("req-1", { sent: true });
      expect(await store.release("req-1")).toBe(false);
      expect(await store.claim("req-1", "hash-a")).toEqual({
        kind: "replay",
        result: { sent: true },
      });
    });

    it("releases nothing for an unknown request", async () => {
      expect(await store.release("req-1")).toBe(false);
    });

    it("releases a claim only once it is old enough", async () => {
      await store.claim("req-1", "hash-a");
      vi.advanceTimersByTime(119_000);
      expect(await store.release("req-1", 120_000)).toBe(false);
      expect(await store.claim("req-1", "hash-a")).toEqual({ kind: "in_progress" });

      vi.advanceTimersByTime(1_000);
      expect(await store.release("req-1", 120_000)).toBe(true);
    });

    it("lets a released claim be taken over once, by a fresh claim", async () => {
      await store.claim("req-1", "hash-a");
      vi.advanceTimersByTime(121_000);
      expect(await store.release("req-1", 120_000)).toBe(true);
      expect(await store.claim("req-1", "hash-a")).toEqual({ kind: "new" });
      expect(await store.release("req-1", 120_000)).toBe(false);
    });
  });
});

describe("webhook events", () => {
  it("processes each event once", async () => {
    expect(await store.isProcessed("WH-1")).toBe(false);
    expect(await store.markProcessed("WH-1")).toBe(true);
    expect(await store.isProcessed("WH-1")).toBe(true);
    expect(await store.markProcessed("WH-1")).toBe(false);
    expect(await store.markProcessed("WH-2")).toBe(true);
  });
});

describe("rate limits", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T00:00:00Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("counts hits inside a window and starts over after it", async () => {
    expect(await store.hitRateLimit("ai", 60)).toBe(1);
    expect(await store.hitRateLimit("ai", 60)).toBe(2);
    expect(await store.hitRateLimit("other", 60)).toBe(1);

    vi.advanceTimersByTime(61_000);
    expect(await store.hitRateLimit("ai", 60)).toBe(1);
  });
});

describe("cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T00:00:00Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("returns a stored value until it expires", async () => {
    expect(await store.getCached("extract:a")).toBeNull();
    await store.putCached("extract:a", { items: [1, 2] }, 60);
    expect(await store.getCached("extract:a")).toEqual({ items: [1, 2] });
    expect(await store.getCached("extract:b")).toBeNull();

    vi.advanceTimersByTime(60_000);
    expect(await store.getCached("extract:a")).toBeNull();
  });

  it("replaces the value and the expiry when a key is stored again", async () => {
    await store.putCached("extract:a", "old", 60);
    vi.advanceTimersByTime(50_000);
    await store.putCached("extract:a", "new", 60);
    vi.advanceTimersByTime(50_000);
    expect(await store.getCached("extract:a")).toBe("new");
  });
});

describe("activity and reminders", () => {
  const event = (id: string, at: string): ActivityEvent => ({
    id,
    kind: "paid",
    invoiceId: "INV2-1",
    invoiceNumber: "INV-0001",
    clientName: "Halden Coffee Co.",
    at,
  });

  it("returns the latest events first, up to the limit", async () => {
    await store.addActivity(event("a", "2026-10-01T00:00:00Z"));
    await store.addActivity(event("b", "2026-10-03T00:00:00Z"));
    await store.addActivity(event("c", "2026-10-02T00:00:00Z"));
    const latest = await store.latestActivity(2);
    expect(latest.map((item) => item.id)).toEqual(["b", "c"]);
  });

  it("keeps reminder history per invoice", async () => {
    await store.logReminder({
      invoiceId: "INV2-1",
      tone: "gentle",
      sentAt: "2026-10-10T00:00:00Z",
    });
    await store.logReminder({ invoiceId: "INV2-2", tone: "firm", sentAt: "2026-10-11T00:00:00Z" });
    expect(await store.reminderHistory("INV2-1")).toEqual([
      { invoiceId: "INV2-1", tone: "gentle", sentAt: "2026-10-10T00:00:00Z" },
    ]);
  });
});

describe("settings, rates and payouts", () => {
  it("starts without settings and keeps the saved ones", async () => {
    expect(await store.getSettings()).toBeNull();
    await store.saveSettings(settings);
    expect(await store.getSettings()).toEqual(settings);
  });

  it("keeps the latest rates with the day they were fetched", async () => {
    const rates = { USD: 85, EUR: 102, GBP: 127.5, CAD: 63.75, AUD: 56.6667 };
    expect(await store.getLatestRates()).toBeNull();
    await store.putRates({ rates, onDate: "2026-10-28", fetchedOn: "2026-10-29" });
    expect(await store.getLatestRates()).toEqual({
      rates,
      onDate: "2026-10-28",
      fetchedOn: "2026-10-29",
    });
  });

  it("stores an actual payout per invoice", async () => {
    const payout: ActualPayout = {
      fee: { currency: "USD", value: "20.10" },
      net: { currency: "USD", value: "429.90" },
      exchangeRate: 82.85,
      netInr: 35617,
      source: "paypal_capture",
    };
    expect(await store.getActualPayout("INV2-1")).toBeNull();
    await store.putActualPayout("INV2-1", payout);
    expect(await store.getActualPayout("INV2-1")).toEqual(payout);
  });

  it("answers a ping", async () => {
    await expect(store.ping()).resolves.toBeUndefined();
  });
});

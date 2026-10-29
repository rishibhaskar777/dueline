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
});

describe("webhook events", () => {
  it("processes each event once", async () => {
    expect(await store.markProcessed("WH-1")).toBe(true);
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

import { beforeEach, describe, expect, it } from "vitest";
import {
  PAYPAL_REMINDERS_PER_DAY,
  recordPayPalLimit,
  remindersLeftToday,
} from "@/lib/reminders/daily-limit";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";

// 11:00 in India on 31 Oct, and the same time a day later.
const NOON = new Date("2026-10-31T05:30:00Z");
const NEXT_DAY = new Date("2026-11-01T05:30:00Z");

let store: Store;

beforeEach(() => {
  store = createMemoryStore();
});

describe("remindersLeftToday", () => {
  it("starts at the two a day PayPal allows and counts reminders for any invoice", async () => {
    expect(await remindersLeftToday(store, NOON)).toBe(PAYPAL_REMINDERS_PER_DAY);
    await store.logReminder({
      invoiceId: "a",
      tone: "gentle",
      sentAt: NOON.toISOString(),
      channel: "paypal",
    });
    expect(await remindersLeftToday(store, NOON)).toBe(1);
    await store.logReminder({
      invoiceId: "b",
      tone: "firm",
      sentAt: NOON.toISOString(),
      channel: "paypal",
    });
    await store.logReminder({
      invoiceId: "c",
      tone: "final",
      sentAt: NOON.toISOString(),
      channel: "paypal",
    });
    expect(await remindersLeftToday(store, NOON)).toBe(0);
  });

  it("counts the India day, which starts at 18:30 UTC the evening before", async () => {
    await store.logReminder({
      invoiceId: "a",
      tone: "gentle",
      sentAt: "2026-10-30T18:29:00Z",
      channel: "paypal",
    });
    await store.logReminder({
      invoiceId: "b",
      tone: "gentle",
      sentAt: "2026-10-30T18:31:00Z",
      channel: "paypal",
    });
    expect(await remindersLeftToday(store, NOON)).toBe(1);
  });

  it("is none for the rest of the India day once PayPal has refused, then resets", async () => {
    await recordPayPalLimit(store, NOON);
    expect(await remindersLeftToday(store, NOON)).toBe(0);
    expect(await remindersLeftToday(store, NEXT_DAY)).toBe(PAYPAL_REMINDERS_PER_DAY);
  });
});

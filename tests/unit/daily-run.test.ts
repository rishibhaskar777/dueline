import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDailyDigest } from "@/lib/automation/daily-digest";
import { runDailyPreparation } from "@/lib/automation/daily-run";
import { dismissQueueItem, listQueue } from "@/lib/automation/queue";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { DEFAULT_SETTINGS, type InvoiceSummary, type RepeatSchedule } from "@/types";
import { stubEnv } from "../support/env";
import { jsonResponse } from "../support/http";
import { ecbResponse } from "../support/rates";
import { BRIGHTWELL, OKAFOR, openInvoice, overdueInvoice, paidInvoice } from "../support/summaries";

const paypal = vi.hoisted(() => ({
  loadInvoices: vi.fn(),
  clearInvoiceCaches: vi.fn(),
  sendInvoice: vi.fn(),
  remindInvoice: vi.fn(),
  createDraftInvoice: vi.fn(),
}));
vi.mock("@/lib/paypal/summaries", () => ({
  loadInvoices: paypal.loadInvoices,
  clearInvoiceCaches: paypal.clearInvoiceCaches,
}));
vi.mock("@/lib/paypal/invoices", () => ({
  sendInvoice: paypal.sendInvoice,
  remindInvoice: paypal.remindInvoice,
  createDraftInvoice: paypal.createDraftInvoice,
}));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

const MORNING = "2026-11-05T00:40:00Z"; // 6:10 in India
const NEXT_MORNING = "2026-11-06T00:40:00Z";
const TODAY = "2026-11-05";

const okafor = overdueInvoice("2026-10-26", 10, OKAFOR);
const brightwell = overdueInvoice("2026-11-02", 3, BRIGHTWELL);
const northpine = overdueInvoice("2026-11-04", 1, {
  name: "Northpine Studio",
  email: "n@x.example",
});

function serve(...summaries: InvoiceSummary[]): void {
  paypal.loadInvoices.mockResolvedValue(
    summaries.map((summary) => ({
      summary,
      amountDue: summary.amount,
      underLut: false,
      sac: null,
      paymentId: null,
      marker: "dueline-request:test",
    })),
  );
}

const retainer: RepeatSchedule = {
  id: "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c",
  clientKey: "halden-coffee-co",
  clientName: "Halden Coffee Co.",
  clientEmail: "buyer@personal.example.com",
  currency: "USD",
  items: [{ name: "Retainer", quantity: 1, unitAmount: "500.00", sac: null }],
  purposeCode: "P1099",
  includeLutNote: false,
  dayOfMonth: 5,
  nextOn: TODAY,
  paused: false,
};

beforeEach(() => {
  store = createMemoryStore();
  stubEnv({ DEMO_TODAY: TODAY });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(MORNING));
  Object.values(paypal).forEach((mock) => mock.mockReset());
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
    new URL(String(input)).searchParams.has("from") ? jsonResponse([]) : ecbResponse("2026-11-04"),
  );
  serve(
    okafor,
    brightwell,
    northpine,
    paidInvoice("2026-10-01", "2026-11-04"),
    openInvoice("2026-11-20"),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the daily preparation", () => {
  it("queues the invoices that are late enough, most days late first", async () => {
    const { ran } = await runDailyPreparation();

    expect(ran).toBe(true);
    const queue = await listQueue();
    expect(queue.map(({ invoiceId }) => invoiceId)).toEqual([okafor.id, brightwell.id]);
    expect(queue[0]).toMatchObject({ kind: "reminder", repeatId: null });
    expect(queue[0].title).toBe("Remind Okafor & Reyes about " + okafor.number);
  });

  it("uses the days from the settings", async () => {
    await store.saveSettings({ ...DEFAULT_SETTINGS, remindAfterDays: 1 });
    await runDailyPreparation();
    expect((await listQueue()).map(({ invoiceId }) => invoiceId)).toEqual([
      okafor.id,
      brightwell.id,
      northpine.id,
    ]);
  });

  it("does the work once a day, however often it is asked", async () => {
    await runDailyPreparation();
    const preparations = paypal.clearInvoiceCaches.mock.calls.length;

    const again = await runDailyPreparation();
    expect(again.ran).toBe(false);
    expect(await listQueue()).toHaveLength(2);
    expect(paypal.clearInvoiceCaches).toHaveBeenCalledTimes(preparations);
  });

  it("hides a dismissed reminder until the next run", async () => {
    await runDailyPreparation();
    const [first] = await listQueue();
    await dismissQueueItem(first.id);

    expect((await runDailyPreparation()).ran).toBe(false);
    expect((await listQueue()).map(({ id }) => id)).not.toContain(first.id);

    vi.setSystemTime(new Date(NEXT_MORNING));
    await runDailyPreparation();
    expect((await listQueue()).map(({ id }) => id)).toContain(first.id);
  });

  it("refreshes the reminders each day without duplicating them", async () => {
    await runDailyPreparation();
    vi.setSystemTime(new Date(NEXT_MORNING));

    expect((await runDailyPreparation()).ran).toBe(true);
    expect((await listQueue()).map(({ id }) => id)).toEqual([
      `reminder.${okafor.id}`,
      `reminder.${brightwell.id}`,
    ]);
  });

  it("drops a reminder once the invoice is paid", async () => {
    await runDailyPreparation();
    serve(brightwell, paidInvoice("2026-10-01", "2026-11-04"));
    vi.setSystemTime(new Date(NEXT_MORNING));
    await runDailyPreparation();

    expect((await listQueue()).map(({ invoiceId }) => invoiceId)).toEqual([brightwell.id]);
  });

  it("drops and deletes a queued reminder whose invoice was cancelled", async () => {
    await runDailyPreparation();
    serve({ ...okafor, paypalStatus: "CANCELLED" }, brightwell);

    expect((await listQueue()).map(({ invoiceId }) => invoiceId)).toEqual([brightwell.id]);
    expect((await store.listQueue()).map(({ invoiceId }) => invoiceId)).toEqual([brightwell.id]);
  });

  it("drops and deletes a queued reminder whose invoice was paid or is no longer overdue", async () => {
    await runDailyPreparation();
    serve(
      { ...okafor, dueState: "paid", paypalStatus: "PAID", paidOn: TODAY },
      {
        ...brightwell,
        dueState: "on_time",
        daysLate: 0,
      },
    );

    expect(await listQueue()).toEqual([]);
    expect(await store.listQueue()).toEqual([]);
  });

  it("keeps a retainer, which has no invoice, whatever the invoices are", async () => {
    await store.saveRepeat(retainer);
    await runDailyPreparation();
    serve();

    expect((await listQueue()).map(({ kind }) => kind)).toEqual(["repeat"]);
  });

  it("clears the reminders when the setting is switched off, and keeps the retainers", async () => {
    await store.saveRepeat(retainer);
    await runDailyPreparation();
    await store.saveSettings({ ...DEFAULT_SETTINGS, prepareReminders: false });
    vi.setSystemTime(new Date(NEXT_MORNING));
    await runDailyPreparation();

    expect((await listQueue()).map(({ kind }) => kind)).toEqual(["repeat"]);
  });

  it("leaves out an invoice already reminded today", async () => {
    await store.logReminder({
      invoiceId: okafor.id,
      tone: "gentle",
      sentAt: "2026-11-04T20:00:00Z",
      channel: "paypal",
    });
    await runDailyPreparation();
    expect((await listQueue()).map(({ invoiceId }) => invoiceId)).toEqual([brightwell.id]);
  });

  it("writes no reminder drafts when the setting is off, but still prepares repeats", async () => {
    await store.saveSettings({ ...DEFAULT_SETTINGS, prepareReminders: false });
    await store.saveRepeat(retainer);
    await runDailyPreparation();

    const queue = await listQueue();
    expect(queue.map(({ kind }) => kind)).toEqual(["repeat"]);
    expect(queue[0].title).toBe("Retainer for Halden Coffee Co. is ready to send");
    expect((await store.listRepeats())[0].nextOn).toBe("2026-12-05");
  });

  it("turns a due repeat into a draft once, and moves its date on", async () => {
    await store.saveRepeat(retainer);
    await runDailyPreparation();
    vi.setSystemTime(new Date("2026-11-05T01:30:00Z"));
    await runDailyPreparation();

    const repeats = (await listQueue()).filter(({ kind }) => kind === "repeat");
    expect(repeats).toHaveLength(1);
    expect(repeats[0].repeatId).toBe(retainer.id);
    expect((await store.listRepeats())[0].nextOn).toBe("2026-12-05");
  });

  it("keeps a retainer in the queue through two later runs until it is dismissed", async () => {
    await store.saveRepeat(retainer);
    await runDailyPreparation();
    const itemId = (await listQueue()).find(({ kind }) => kind === "repeat")?.id ?? "";
    expect(itemId).not.toBe("");

    for (const morning of [NEXT_MORNING, "2026-11-07T00:40:00Z"]) {
      vi.setSystemTime(new Date(morning));
      expect((await runDailyPreparation()).ran).toBe(true);
      expect((await listQueue()).map(({ id }) => id)).toContain(itemId);
    }

    await dismissQueueItem(itemId);
    vi.setSystemTime(new Date("2026-11-08T00:40:00Z"));
    await runDailyPreparation();
    expect((await listQueue()).map(({ id }) => id)).not.toContain(itemId);
  });

  it("never sends, creates or reminds anything in PayPal", async () => {
    await store.saveRepeat(retainer);
    await runDailyPreparation();
    expect(paypal.sendInvoice).not.toHaveBeenCalled();
    expect(paypal.remindInvoice).not.toHaveBeenCalled();
    expect(paypal.createDraftInvoice).not.toHaveBeenCalled();
    expect(paypal.clearInvoiceCaches).toHaveBeenCalled();
  });

  it("can be run again after a failure", async () => {
    paypal.loadInvoices.mockRejectedValueOnce(new Error("PayPal is down"));
    await expect(runDailyPreparation()).rejects.toThrow("PayPal is down");

    serve(okafor);
    expect((await runDailyPreparation()).ran).toBe(true);
    expect(await listQueue()).toHaveLength(1);
  });
});

describe("the digest", () => {
  it("is recorded by the run, with the number of drafts prepared", async () => {
    const { digest } = await runDailyPreparation();
    expect(digest).toMatchObject({ day: TODAY, preparedDrafts: 2 });
    expect(digest.newlyOverdue.map(({ invoiceId }) => invoiceId)).toEqual(
      expect.arrayContaining([brightwell.id, northpine.id]),
    );
    expect(digest.paidSinceYesterday).toHaveLength(1);
    expect(await getDailyDigest()).toEqual(digest);
  });

  it("ignores an invoice cancelled after the run, and counts only the drafts still valid", async () => {
    await runDailyPreparation();
    serve(
      { ...brightwell, paypalStatus: "CANCELLED" },
      { ...northpine, paypalStatus: "CANCELLED" },
      okafor,
    );

    const digest = await getDailyDigest();

    expect(digest.preparedDrafts).toBe(1);
    expect(digest.newlyOverdue).toEqual([]);
    expect(JSON.stringify(digest)).not.toContain(brightwell.number);
    expect(JSON.stringify(digest)).not.toContain(northpine.number);
  });

  it("is worked out on demand when the run has not happened", async () => {
    const digest = await getDailyDigest();
    expect(digest.preparedDrafts).toBe(0);
    expect(digest.newlyOverdue.length).toBeGreaterThan(0);
    expect(await store.listQueue()).toEqual([]);
  });

  it("carries the rate alerts that are triggered", async () => {
    await store.saveSettings({
      ...DEFAULT_SETTINGS,
      rateAlerts: [{ currency: "USD", direction: "above", threshold: 80 }],
    });
    const { digest } = await runDailyPreparation();
    expect(digest.rateAlerts).toEqual([
      { currency: "USD", direction: "above", threshold: 80, rate: 85 },
    ]);
  });
});

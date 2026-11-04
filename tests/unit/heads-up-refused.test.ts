import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakePayPal, type FakePayPal } from "@/lib/paypal/offline/fake-paypal";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { remindersLeftToday } from "@/lib/reminders/daily-limit";
import { PAYPAL_HEADS_UP_REFUSED } from "@/lib/reminders/heads-up-refusal";
import { listHeadsUpDrafts } from "@/lib/reminders/reminder-drafts";
import { sendReminder } from "@/lib/reminders/send-reminder";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { EMPTY_PROFILE, type SendReminderRequest } from "@/types";
import { stubEnv } from "../support/env";
import unpaidFixture from "../fixtures/paypal/invoice-unpaid.json";
import { openInvoice } from "../support/summaries";

const paypal = vi.hoisted(() => ({ getInvoice: vi.fn(), remindInvoice: vi.fn() }));
const loader = vi.hoisted(() => ({ loadInvoices: vi.fn() }));

vi.mock("@/lib/paypal/invoices", () => ({
  nextInvoiceNumber: vi.fn(),
  createDraftInvoice: vi.fn(),
  sendInvoice: vi.fn(),
  getInvoice: paypal.getInvoice,
  remindInvoice: paypal.remindInvoice,
}));
vi.mock("@/lib/paypal/summaries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/paypal/summaries")>()),
  findInvoiceByMemo: vi.fn(),
  refreshSnapshotNow: vi.fn(),
  loadInvoices: loader.loadInvoices,
}));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

const unpaid = unpaidFixture as PayPalInvoice;
const headsUp: SendReminderRequest = {
  invoiceId: unpaid.id,
  tone: "heads_up",
  channel: "paypal",
  requestId: "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c",
};
const retry = { ...headsUp, requestId: "9a1c7e52-0b3d-4f6a-8d2e-5c4b3a291807" };

let fake: FakePayPal;

beforeEach(async () => {
  store = createMemoryStore();
  fake = createFakePayPal();
  fake.invoices.set(unpaid.id, unpaid);
  // The invoice falls due on 30 Oct, so on 28 Oct it is two days away.
  stubEnv({ DEMO_TODAY: "2026-10-28" });
  vi.resetAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  paypal.getInvoice.mockResolvedValue(unpaid);
  paypal.remindInvoice.mockImplementation((id: string) => fake.remindInvoice(id));
  const summary = { ...openInvoice("2026-10-30"), id: unpaid.id, dueState: "due_soon" as const };
  loader.loadInvoices.mockResolvedValue([
    {
      summary,
      amountDue: summary.amount,
      underLut: false,
      paymentId: null,
      marker: "dueline-request:test",
    },
  ]);
  await store.saveProfile({
    ...EMPTY_PROFILE,
    yourName: "Riya Sharma",
    sendHeadsUp: true,
    headsUpDays: 3,
  });
});

describe("PayPal refusing a reminder before the due date", () => {
  it.each([400, 403, 422])("on a %s: nothing is logged, counted or recorded", async (status) => {
    fake.refuseReminders(status);

    await expect(sendReminder(headsUp)).rejects.toThrow(PAYPAL_HEADS_UP_REFUSED);

    expect(await store.reminderHistory(unpaid.id)).toEqual([]);
    expect(await store.latestActivity(5)).toEqual([]);
    expect(await remindersLeftToday(store)).toBe(2);
  });

  it("leaves the PayPal button off the card for the rest of the day, and PayPal is not asked again", async () => {
    fake.refuseReminders(400);
    const [before] = await listHeadsUpDrafts();
    expect(before.paypalRefused).toBeUndefined();

    await expect(sendReminder(headsUp)).rejects.toThrow(PAYPAL_HEADS_UP_REFUSED);
    await expect(sendReminder(retry)).rejects.toThrow(PAYPAL_HEADS_UP_REFUSED);

    expect(paypal.remindInvoice).toHaveBeenCalledTimes(1);
    const [after] = await listHeadsUpDrafts();
    expect(after.paypalRefused).toBe(true);
  });

  it("still allows the freelancer's own message", async () => {
    fake.refuseReminders(400);
    await expect(sendReminder(headsUp)).rejects.toThrow(PAYPAL_HEADS_UP_REFUSED);

    const { sentAt } = await sendReminder({ ...retry, channel: "email" });

    expect(await store.reminderHistory(unpaid.id)).toEqual([
      { invoiceId: unpaid.id, tone: "heads_up", sentAt, channel: "email" },
    ]);
  });

  it("is forgotten the next day in India", async () => {
    fake.refuseReminders(400);
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-10-28T18:29:00Z"));
      await expect(sendReminder(headsUp)).rejects.toThrow(PAYPAL_HEADS_UP_REFUSED);
      expect((await listHeadsUpDrafts())[0].paypalRefused).toBe(true);

      vi.setSystemTime(new Date("2026-10-28T18:31:00Z"));
      expect((await listHeadsUpDrafts())[0].paypalRefused).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not take PayPal's daily limit for a refusal: that is still a limit", async () => {
    fake.refuseReminders(429);
    await expect(sendReminder(headsUp)).rejects.toThrow("PayPal allows two reminders a day");
    expect(await remindersLeftToday(store)).toBe(0);
  });

  it("does not hide the button for a PayPal server error", async () => {
    fake.refuseReminders(500);
    await expect(sendReminder(headsUp)).rejects.not.toThrow(PAYPAL_HEADS_UP_REFUSED);
    expect((await listHeadsUpDrafts())[0].paypalRefused).toBeUndefined();
  });
});

describe("a heads-up PayPal accepts", () => {
  it("is logged and counted once however many times the same request is sent", async () => {
    const first = await sendReminder(headsUp);
    const again = await sendReminder(headsUp);

    expect(again).toEqual(first);
    expect(paypal.remindInvoice).toHaveBeenCalledTimes(1);
    expect(await store.reminderHistory(unpaid.id)).toHaveLength(1);
    expect(await store.latestActivity(5)).toHaveLength(1);
    expect(await remindersLeftToday(store)).toBe(1);
  });
});

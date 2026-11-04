import { beforeEach, describe, expect, it, vi } from "vitest";
import { describeEvent } from "@/components/receivables/activity-text";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { remindersLeftToday } from "@/lib/reminders/daily-limit";
import { sendReminder } from "@/lib/reminders/send-reminder";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import type { SendReminderRequest } from "@/types";
import { stubEnv } from "../support/env";
import unpaidFixture from "../fixtures/paypal/invoice-unpaid.json";

const paypal = vi.hoisted(() => ({
  getInvoice: vi.fn(),
  remindInvoice: vi.fn(),
  refreshSnapshotNow: vi.fn(),
}));

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
  refreshSnapshotNow: paypal.refreshSnapshotNow,
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
const other = "9a1c7e52-0b3d-4f6a-8d2e-5c4b3a291807";

beforeEach(() => {
  store = createMemoryStore();
  // The invoice falls due on 30 Oct, so on 28 Oct it is two days away.
  stubEnv({ DEMO_TODAY: "2026-10-28" });
  vi.resetAllMocks();
  paypal.getInvoice.mockResolvedValue(unpaid);
  paypal.remindInvoice.mockResolvedValue(undefined);
});

describe("sending a heads-up", () => {
  it("asks PayPal for its reminder, logs it with the heads-up tone and records the activity", async () => {
    const { sentAt } = await sendReminder(headsUp);

    expect(paypal.remindInvoice).toHaveBeenCalledWith(unpaid.id);
    expect(await store.reminderHistory(unpaid.id)).toEqual([
      { invoiceId: unpaid.id, tone: "heads_up", sentAt, channel: "paypal" },
    ]);
    const [event] = await store.latestActivity(5);
    expect(event).toMatchObject({
      id: `reminder:${headsUp.requestId}`,
      kind: "heads_up_sent",
      invoiceNumber: "INV-0101",
    });
    expect(describeEvent(event)).toBe("Heads-up sent to Tandem Health for invoice INV-0101");
  });

  it("counts against PayPal's two a day like any reminder, and an email does not", async () => {
    expect(await remindersLeftToday(store)).toBe(2);
    await sendReminder({ ...headsUp, channel: "email" });
    expect(await remindersLeftToday(store)).toBe(2);
    expect(paypal.remindInvoice).not.toHaveBeenCalled();

    const other2 = { ...headsUp, invoiceId: "INV2-OTHER", requestId: other };
    paypal.getInvoice.mockResolvedValue({ ...unpaid, id: "INV2-OTHER" });
    await sendReminder(other2);
    expect(await remindersLeftToday(store)).toBe(1);
  });

  it("is sent once per invoice, whichever channel is used", async () => {
    await sendReminder({ ...headsUp, channel: "email" });
    await expect(sendReminder({ ...headsUp, requestId: other })).rejects.toThrow(
      "A heads-up was already sent for this invoice.",
    );
    expect(paypal.remindInvoice).not.toHaveBeenCalled();
  });

  it("is refused once the invoice is late", async () => {
    stubEnv({ DEMO_TODAY: "2026-11-05" });
    await expect(sendReminder(headsUp)).rejects.toThrow(
      "This invoice is already late. Send a reminder instead.",
    );
    expect(paypal.remindInvoice).not.toHaveBeenCalled();
  });

  it("is the only tone allowed before the due date", async () => {
    await expect(sendReminder({ ...headsUp, tone: "gentle" })).rejects.toThrow(
      "This invoice is not overdue.",
    );
  });
});

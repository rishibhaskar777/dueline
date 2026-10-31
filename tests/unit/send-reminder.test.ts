import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecipientNotAllowedError } from "@/lib/demo-guard";
import { InvoiceNotFoundError } from "@/lib/invoices/errors";
import { PayPalApiError } from "@/lib/paypal/errors";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { InvalidReminderError, ReminderLimitError } from "@/lib/reminders/errors";
import { sendReminder } from "@/lib/reminders/send-reminder";
import { DuplicateRequestError } from "@/lib/requests/errors";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import type { SendReminderRequest } from "@/types";
import { stubEnv } from "../support/env";
import paidFixture from "../fixtures/paypal/invoice-paid.json";
import unpaidFixture from "../fixtures/paypal/invoice-unpaid.json";

const paypal = vi.hoisted(() => ({
  getInvoice: vi.fn(),
  remindInvoice: vi.fn(),
  clearInvoiceCaches: vi.fn(),
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
  clearInvoiceCaches: paypal.clearInvoiceCaches,
}));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

const requestId = "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c";
const otherRequestId = "9a1c7e52-0b3d-4f6a-8d2e-5c4b3a291807";

const unpaid = unpaidFixture as PayPalInvoice;
const request: SendReminderRequest = {
  invoiceId: unpaid.id,
  subject: "A quick reminder about invoice INV-0101",
  message:
    "Hi Tandem Health team,\n\nInvoice INV-0101 is overdue. Please use Pay now.\n\nThank you",
  tone: "gentle",
  requestId,
};

function rejection(status: number): PayPalApiError {
  return new PayPalApiError({
    status,
    paypalName: "ERROR",
    message: "PayPal said no.",
    debugId: "d1",
  });
}

beforeEach(() => {
  store = createMemoryStore();
  // The invoice fell due on 30 Oct, so it is 6 days overdue.
  stubEnv({ DEMO_TODAY: "2026-11-05" });
  vi.resetAllMocks();
  paypal.getInvoice.mockResolvedValue(unpaid);
  paypal.remindInvoice.mockResolvedValue(undefined);
});

afterEach(() => vi.useRealTimers());

describe("sendReminder", () => {
  it("sends through PayPal, logs the reminder and records the activity", async () => {
    const { sentAt } = await sendReminder(request);

    expect(paypal.remindInvoice).toHaveBeenCalledWith(unpaid.id, {
      subject: request.subject,
      note: request.message,
    });
    expect(await store.reminderHistory(unpaid.id)).toEqual([
      { invoiceId: unpaid.id, tone: "gentle", sentAt },
    ]);
    expect(await store.latestActivity(5)).toEqual([
      {
        id: `reminder:${requestId}`,
        kind: "reminder_sent",
        invoiceId: unpaid.id,
        invoiceNumber: "INV-0101",
        clientName: "Tandem Health",
        at: sentAt,
        amount: { currency: "USD", value: "900.00" },
      },
    ]);
    expect(paypal.clearInvoiceCaches).toHaveBeenCalledTimes(1);
  });

  it("returns the stored time for a repeat without calling PayPal", async () => {
    const first = await sendReminder(request);
    vi.clearAllMocks();

    expect(await sendReminder(request)).toEqual(first);
    expect(paypal.getInvoice).not.toHaveBeenCalled();
    expect(paypal.remindInvoice).not.toHaveBeenCalled();
  });

  it("refuses the same request ID with a different message", async () => {
    await sendReminder(request);
    await expect(
      sendReminder({ ...request, message: "A different message entirely." }),
    ).rejects.toBeInstanceOf(DuplicateRequestError);
  });

  it("refuses a paid invoice", async () => {
    paypal.getInvoice.mockResolvedValue(paidFixture);
    await expect(sendReminder(request)).rejects.toThrow("This invoice is already paid.");
    expect(paypal.remindInvoice).not.toHaveBeenCalled();
  });

  it("refuses an invoice that is not yet due", async () => {
    stubEnv({ DEMO_TODAY: "2026-10-20" });
    const error = await sendReminder(request).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(InvalidReminderError);
    expect((error as Error).message).toBe("This invoice is not overdue.");
    expect(paypal.remindInvoice).not.toHaveBeenCalled();
  });

  it("refuses an invoice PayPal cannot remind about", async () => {
    paypal.getInvoice.mockResolvedValue({ ...unpaid, status: "CANCELLED" });
    await expect(sendReminder(request)).rejects.toBeInstanceOf(InvalidReminderError);
  });

  it("refuses an unknown invoice", async () => {
    paypal.getInvoice.mockRejectedValue(rejection(404));
    await expect(sendReminder(request)).rejects.toBeInstanceOf(InvoiceNotFoundError);
  });

  it("lets a refused request be tried again with the same request ID", async () => {
    paypal.getInvoice.mockResolvedValueOnce(paidFixture);
    await expect(sendReminder(request)).rejects.toBeInstanceOf(InvalidReminderError);

    await expect(sendReminder(request)).resolves.toHaveProperty("sentAt");
  });

  it("does not take the client's business name for a link", async () => {
    paypal.getInvoice.mockResolvedValue({
      ...unpaid,
      primary_recipients: [
        {
          billing_info: { email_address: "buyer@personal.example.com", business_name: "Acme.io" },
        },
      ],
    });
    const message =
      "Hi Acme.io team,\n\nInvoice INV-0101 is overdue. Please use Pay now.\n\nThank you";
    await expect(sendReminder({ ...request, message })).resolves.toHaveProperty("sentAt");
    expect(paypal.remindInvoice).toHaveBeenCalledTimes(1);
  });

  it("refuses a link, naming the field, and lets the request ID be used again", async () => {
    const linked = { ...request, message: `${request.message} Pay at https://pay.example.org` };
    await expect(sendReminder(linked)).rejects.toThrow(
      "The message must not contain links or email addresses.",
    );
    expect(paypal.remindInvoice).not.toHaveBeenCalled();

    await expect(sendReminder(request)).resolves.toHaveProperty("sentAt");
  });

  it("refuses a recipient that is not a sandbox buyer before reminding", async () => {
    paypal.getInvoice.mockResolvedValue({
      ...unpaid,
      primary_recipients: [{ billing_info: { email_address: "client@acme.example" } }],
    });
    await expect(sendReminder(request)).rejects.toBeInstanceOf(RecipientNotAllowedError);
    expect(paypal.remindInvoice).not.toHaveBeenCalled();
  });

  it("allows only one reminder per invoice per day", async () => {
    await sendReminder(request);
    vi.clearAllMocks();

    const error = await sendReminder({ ...request, requestId: otherRequestId }).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(ReminderLimitError);
    expect((error as Error).message).toBe("A reminder was already sent today for this invoice.");
    expect(paypal.remindInvoice).not.toHaveBeenCalled();
  });

  it("allows a reminder after the one sent yesterday", async () => {
    await store.logReminder({
      invoiceId: unpaid.id,
      tone: "gentle",
      sentAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    });
    await expect(sendReminder({ ...request, tone: "firm" })).resolves.toHaveProperty("sentAt");
  });

  it("explains PayPal's two-a-day limit and frees the request ID", async () => {
    paypal.remindInvoice.mockRejectedValueOnce(rejection(429));
    const error = await sendReminder(request).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ReminderLimitError);
    expect((error as Error).message).toBe(
      "PayPal allows two reminders a day for this account. Try again tomorrow.",
    );
    expect(await store.reminderHistory(unpaid.id)).toEqual([]);

    await expect(sendReminder(request)).resolves.toHaveProperty("sentAt");
    expect(paypal.remindInvoice).toHaveBeenCalledTimes(2);
  });

  it("frees the request ID when PayPal fails another way", async () => {
    paypal.remindInvoice.mockRejectedValueOnce(rejection(500));
    await expect(sendReminder(request)).rejects.toBeInstanceOf(PayPalApiError);
    await expect(sendReminder(request)).resolves.toHaveProperty("sentAt");
  });
});

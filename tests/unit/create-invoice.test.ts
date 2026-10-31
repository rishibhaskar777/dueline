import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAndSendInvoice, sendExistingDraft } from "@/lib/invoices/create-invoice";
import { RecipientNotAllowedError } from "@/lib/demo-guard";
import { CreateOutcomeUnknownError, InvoiceNotFoundError } from "@/lib/invoices/errors";
import { PayPalApiError, PayPalTimeoutError } from "@/lib/paypal/errors";
import { requestMemo } from "@/lib/paypal/invoice-body";
import type { PayPalInvoice, PayPalInvoiceInput } from "@/lib/paypal/types";
import { DuplicateRequestError } from "@/lib/requests/errors";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import type { CreateInvoiceRequest } from "@/types";
import { stubEnv } from "../support/env";
import unpaidFixture from "../fixtures/paypal/invoice-unpaid.json";

const paypal = vi.hoisted(() => ({
  nextInvoiceNumber: vi.fn(),
  createDraftInvoice: vi.fn(),
  sendInvoice: vi.fn(),
  getInvoice: vi.fn(),
  findInvoiceByMemo: vi.fn(),
  clearInvoiceCaches: vi.fn(),
}));

vi.mock("@/lib/paypal/invoices", () => ({
  nextInvoiceNumber: paypal.nextInvoiceNumber,
  createDraftInvoice: paypal.createDraftInvoice,
  sendInvoice: paypal.sendInvoice,
  getInvoice: paypal.getInvoice,
}));
vi.mock("@/lib/paypal/summaries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/paypal/summaries")>()),
  findInvoiceByMemo: paypal.findInvoiceByMemo,
  clearInvoiceCaches: paypal.clearInvoiceCaches,
}));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

const requestId = "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c";
const otherRequestId = "9a1c7e52-0b3d-4f6a-8d2e-5c4b3a291807";

const input: Omit<CreateInvoiceRequest, "requestId"> = {
  draft: {
    client: { name: "Halden Coffee Co.", email: "buyer@personal.example.com" },
    currency: "USD",
    dueOn: "2026-11-30",
    items: [{ name: "Logo design (3 options)", quantity: 3, unitAmount: "120.00" }],
    purposeCode: "P1099",
    includeLutNote: false,
  },
};

const base = unpaidFixture as PayPalInvoice;
const draftInvoice: PayPalInvoice = {
  ...base,
  id: "INV2-NEW",
  status: "DRAFT",
  detail: { ...base.detail, memo: requestMemo(requestId) },
};
const sentInvoice: PayPalInvoice = { ...draftInvoice, status: "SENT" };

function rejection(status: number): PayPalApiError {
  return new PayPalApiError({
    status,
    paypalName: "ERROR",
    message: "PayPal said no.",
    debugId: "dbg1",
  });
}

function createdBodies(): PayPalInvoiceInput[] {
  return paypal.createDraftInvoice.mock.calls.map(([body]) => body as PayPalInvoiceInput);
}

beforeEach(() => {
  store = createMemoryStore();
  stubEnv({ DEMO_TODAY: "2026-10-30" });
  vi.resetAllMocks();
  paypal.nextInvoiceNumber.mockResolvedValue("INV-0101");
  paypal.createDraftInvoice.mockResolvedValue(draftInvoice);
  paypal.sendInvoice.mockResolvedValue(undefined);
  paypal.getInvoice.mockResolvedValue(sentInvoice);
  paypal.findInvoiceByMemo.mockResolvedValue(undefined);
});

afterEach(() => vi.useRealTimers());

describe("createAndSendInvoice", () => {
  it("creates the draft, sends it, reads it again and stores the result", async () => {
    const result = await createAndSendInvoice(input, requestId);

    expect(result.sent).toBe(true);
    expect(result.invoice).toMatchObject({
      id: "INV2-NEW",
      paypalStatus: "SENT",
      payLink: "https://www.sandbox.paypal.com/invoice/p/#TEST0001",
    });
    expect(createdBodies()).toHaveLength(1);
    expect(createdBodies()[0].detail).toMatchObject({
      invoice_number: "INV-0101",
      invoice_date: "2026-10-30",
      memo: requestMemo(requestId, input.draft.purposeCode),
    });
    expect(paypal.sendInvoice).toHaveBeenCalledWith(
      "INV2-NEW",
      {
        subject: "Invoice INV-0101",
        note: "Thank you for your business. You can pay securely with PayPal using the link in this email.",
      },
      expect.any(String),
    );
    expect(paypal.getInvoice).toHaveBeenCalledWith("INV2-NEW");
    expect(paypal.clearInvoiceCaches).toHaveBeenCalledTimes(1);
  });

  it("replays the stored result for the same request without calling PayPal", async () => {
    const first = await createAndSendInvoice(input, requestId);
    vi.clearAllMocks();

    expect(await createAndSendInvoice(input, requestId)).toEqual(first);
    expect(paypal.nextInvoiceNumber).not.toHaveBeenCalled();
    expect(paypal.createDraftInvoice).not.toHaveBeenCalled();
    expect(paypal.sendInvoice).not.toHaveBeenCalled();
  });

  it("refuses the same request ID with a different body", async () => {
    await createAndSendInvoice(input, requestId);
    vi.clearAllMocks();

    const other = { draft: { ...input.draft, dueOn: "2026-12-15" } };
    await expect(createAndSendInvoice(other, requestId)).rejects.toBeInstanceOf(
      DuplicateRequestError,
    );
    expect(paypal.createDraftInvoice).not.toHaveBeenCalled();
  });

  it("treats the same fields in another order as the same body", async () => {
    await createAndSendInvoice(input, requestId);
    const reordered = {
      draft: {
        includeLutNote: false,
        purposeCode: "P1099",
        items: [{ unitAmount: "120.00", quantity: 3, name: "Logo design (3 options)" }],
        dueOn: "2026-11-30",
        currency: "USD",
        client: { email: "buyer@personal.example.com", name: "Halden Coffee Co." },
      },
    } as typeof input;
    await createAndSendInvoice(reordered, requestId);
    expect(paypal.createDraftInvoice).toHaveBeenCalledTimes(1);
  });

  describe("demo guard", () => {
    const outsider = {
      draft: { ...input.draft, client: { name: "Acme", email: "a@acme.example" } },
    };

    it("refuses a recipient that is not a sandbox buyer before any PayPal call", async () => {
      await expect(createAndSendInvoice(outsider, requestId)).rejects.toBeInstanceOf(
        RecipientNotAllowedError,
      );
      expect(paypal.nextInvoiceNumber).not.toHaveBeenCalled();
      expect(paypal.createDraftInvoice).not.toHaveBeenCalled();
    });

    it("lets the corrected invoice use the same request ID", async () => {
      await expect(createAndSendInvoice(outsider, requestId)).rejects.toBeInstanceOf(
        RecipientNotAllowedError,
      );
      const result = await createAndSendInvoice(input, requestId);
      expect(result.sent).toBe(true);
    });

    it("allows any recipient once DEMO_MODE is false", async () => {
      stubEnv({ DEMO_TODAY: "2026-10-30", DEMO_MODE: "false" });
      expect((await createAndSendInvoice(outsider, requestId)).sent).toBe(true);
    });
  });

  describe("when sending fails", () => {
    it.each([
      ["a PayPal error", rejection(422)],
      ["a timeout", new PayPalTimeoutError()],
    ])("returns the draft as not sent after %s and stores that result", async (_name, failure) => {
      paypal.sendInvoice.mockRejectedValue(failure);

      const result = await createAndSendInvoice(input, requestId);
      expect(result.sent).toBe(false);
      expect(result.invoice).toMatchObject({ id: "INV2-NEW", paypalStatus: "DRAFT" });
      expect(paypal.getInvoice).not.toHaveBeenCalled();

      const repeat = await createAndSendInvoice(input, requestId);
      expect(repeat).toEqual(result);
      expect(paypal.createDraftInvoice).toHaveBeenCalledTimes(1);
      expect(paypal.sendInvoice).toHaveBeenCalledTimes(1);
    });
  });

  describe("when PayPal fails to create the draft", () => {
    it("releases the request after a 4xx, since nothing was created", async () => {
      paypal.createDraftInvoice.mockRejectedValueOnce(rejection(422));
      await expect(createAndSendInvoice(input, requestId)).rejects.toMatchObject({ status: 422 });

      const result = await createAndSendInvoice(input, requestId);
      expect(result.sent).toBe(true);
      expect(paypal.createDraftInvoice).toHaveBeenCalledTimes(2);
    });

    it("keeps the request in progress after a timeout, whose outcome is unknown", async () => {
      paypal.createDraftInvoice.mockRejectedValueOnce(new PayPalTimeoutError());
      await expect(createAndSendInvoice(input, requestId)).rejects.toBeInstanceOf(
        CreateOutcomeUnknownError,
      );

      await expect(createAndSendInvoice(input, requestId)).rejects.toMatchObject({
        message: "This invoice is still being created. Check Receivables before trying again.",
      });
      expect(paypal.createDraftInvoice).toHaveBeenCalledTimes(1);
      expect(paypal.findInvoiceByMemo).not.toHaveBeenCalled();
    });

    it("keeps the request in progress after a PayPal server error", async () => {
      paypal.createDraftInvoice.mockRejectedValueOnce(rejection(500));
      await expect(createAndSendInvoice(input, requestId)).rejects.toMatchObject({ status: 500 });
      await expect(createAndSendInvoice(input, requestId)).rejects.toBeInstanceOf(
        DuplicateRequestError,
      );
    });
  });

  describe("a request cut off more than 2 minutes ago", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      paypal.createDraftInvoice.mockRejectedValueOnce(new PayPalTimeoutError());
    });

    async function cutOff(): Promise<void> {
      await expect(createAndSendInvoice(input, requestId)).rejects.toBeInstanceOf(
        CreateOutcomeUnknownError,
      );
    }

    it("is still refused inside the 2 minutes", async () => {
      await cutOff();
      vi.setSystemTime(Date.now() + 119_000);
      await expect(createAndSendInvoice(input, requestId)).rejects.toBeInstanceOf(
        DuplicateRequestError,
      );
      expect(paypal.findInvoiceByMemo).not.toHaveBeenCalled();
    });

    it("finishes with the invoice PayPal made, without a second create", async () => {
      await cutOff();
      paypal.findInvoiceByMemo.mockResolvedValue(draftInvoice);
      vi.setSystemTime(Date.now() + 121_000);

      const result = await createAndSendInvoice(input, requestId);
      expect(paypal.findInvoiceByMemo).toHaveBeenCalledWith(requestMemo(requestId));
      expect(paypal.createDraftInvoice).toHaveBeenCalledTimes(1);
      expect(paypal.sendInvoice).toHaveBeenCalledWith(
        "INV2-NEW",
        expect.anything(),
        expect.any(String),
      );
      expect(result.sent).toBe(true);
    });

    it("does not send again an invoice PayPal already shows as sent", async () => {
      await cutOff();
      paypal.findInvoiceByMemo.mockResolvedValue(sentInvoice);
      vi.setSystemTime(Date.now() + 121_000);

      const result = await createAndSendInvoice(input, requestId);
      expect(result.sent).toBe(true);
      expect(paypal.sendInvoice).not.toHaveBeenCalled();
      expect(paypal.createDraftInvoice).toHaveBeenCalledTimes(1);
    });

    it("creates the invoice once when PayPal made none", async () => {
      await cutOff();
      vi.setSystemTime(Date.now() + 121_000);

      const result = await createAndSendInvoice(input, requestId);
      expect(paypal.createDraftInvoice).toHaveBeenCalledTimes(2);
      expect(result.sent).toBe(true);
    });

    it("lets only one of two callers take the request over", async () => {
      await cutOff();
      paypal.findInvoiceByMemo.mockResolvedValue(draftInvoice);
      vi.setSystemTime(Date.now() + 121_000);

      const outcomes = await Promise.allSettled([
        createAndSendInvoice(input, requestId),
        createAndSendInvoice(input, requestId),
      ]);
      expect(outcomes.map((outcome) => outcome.status).sort()).toEqual(["fulfilled", "rejected"]);
      expect(paypal.sendInvoice).toHaveBeenCalledTimes(1);
    });

    it("keeps the request when the lookup itself fails, so no second invoice is made", async () => {
      await cutOff();
      paypal.findInvoiceByMemo.mockRejectedValue(rejection(422));
      vi.setSystemTime(Date.now() + 121_000);

      await expect(createAndSendInvoice(input, requestId)).rejects.toMatchObject({ status: 422 });
      await expect(createAndSendInvoice(input, requestId)).rejects.toBeInstanceOf(
        DuplicateRequestError,
      );
      expect(paypal.createDraftInvoice).toHaveBeenCalledTimes(1);
    });
  });
});

describe("sendExistingDraft", () => {
  it("sends a draft, reads it again and stores the result", async () => {
    paypal.getInvoice.mockResolvedValueOnce(draftInvoice).mockResolvedValueOnce(sentInvoice);

    const result = await sendExistingDraft("INV2-NEW", otherRequestId);
    expect(paypal.sendInvoice).toHaveBeenCalledWith(
      "INV2-NEW",
      expect.objectContaining({ subject: "Invoice INV-0101" }),
      otherRequestId,
    );
    expect(result).toMatchObject({ sent: true, invoice: { paypalStatus: "SENT" } });
    expect(paypal.clearInvoiceCaches).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    expect(await sendExistingDraft("INV2-NEW", otherRequestId)).toEqual(result);
    expect(paypal.getInvoice).not.toHaveBeenCalled();
  });

  it("does not send an invoice that PayPal already shows as sent", async () => {
    paypal.getInvoice.mockResolvedValue(sentInvoice);
    const result = await sendExistingDraft("INV2-NEW", otherRequestId);
    expect(result.sent).toBe(true);
    expect(paypal.sendInvoice).not.toHaveBeenCalled();
  });

  it("refuses to send a draft addressed to a non-sandbox buyer", async () => {
    const outsider: PayPalInvoice = {
      ...draftInvoice,
      primary_recipients: [{ billing_info: { email_address: "a@acme.example" } }],
    };
    paypal.getInvoice.mockResolvedValue(outsider);
    await expect(sendExistingDraft("INV2-NEW", otherRequestId)).rejects.toBeInstanceOf(
      RecipientNotAllowedError,
    );
    expect(paypal.sendInvoice).not.toHaveBeenCalled();

    paypal.getInvoice.mockResolvedValue(draftInvoice);
    expect((await sendExistingDraft("INV2-NEW", otherRequestId)).sent).toBe(true);
  });

  it("answers not found for an unknown invoice and frees the request", async () => {
    paypal.getInvoice.mockRejectedValueOnce(rejection(404));
    await expect(sendExistingDraft("missing", otherRequestId)).rejects.toBeInstanceOf(
      InvoiceNotFoundError,
    );
    paypal.getInvoice.mockResolvedValue(sentInvoice);
    await expect(sendExistingDraft("missing", otherRequestId)).resolves.toMatchObject({
      sent: true,
    });
  });

  it("frees the request when sending fails, so the retry re-checks the invoice first", async () => {
    paypal.getInvoice.mockResolvedValueOnce(draftInvoice);
    paypal.sendInvoice.mockRejectedValueOnce(new PayPalTimeoutError());
    await expect(sendExistingDraft("INV2-NEW", otherRequestId)).rejects.toBeInstanceOf(
      PayPalTimeoutError,
    );

    paypal.getInvoice.mockResolvedValue(sentInvoice);
    await expect(sendExistingDraft("INV2-NEW", otherRequestId)).resolves.toMatchObject({
      sent: true,
    });
    expect(paypal.sendInvoice).toHaveBeenCalledTimes(1);
  });

  it("refuses a request ID that was used for another invoice", async () => {
    paypal.getInvoice.mockResolvedValue(sentInvoice);
    await sendExistingDraft("INV2-NEW", otherRequestId);
    await expect(sendExistingDraft("INV2-OTHER", otherRequestId)).rejects.toBeInstanceOf(
      DuplicateRequestError,
    );
  });
});

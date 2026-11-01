import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { POST as cancel } from "@/app/api/invoices/[id]/cancel/route";
import { GET as detail } from "@/app/api/invoices/[id]/route";
import { POST as record } from "@/app/api/invoices/[id]/record-payment/route";
import { PayPalApiError } from "@/lib/paypal/errors";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { stubEnv } from "../support/env";
import unpaidFixture from "../fixtures/paypal/invoice-unpaid.json";
import "../support/next-server";

const paypal = vi.hoisted(() => ({
  getInvoice: vi.fn(),
  cancelInvoice: vi.fn(),
  recordExternalPayment: vi.fn(),
  loadInvoices: vi.fn(),
  clearInvoiceCaches: vi.fn(),
}));

vi.mock("@/lib/paypal/invoices", () => ({
  getInvoice: paypal.getInvoice,
  cancelInvoice: paypal.cancelInvoice,
  recordExternalPayment: paypal.recordExternalPayment,
}));
vi.mock("@/lib/paypal/summaries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/paypal/summaries")>()),
  loadInvoices: paypal.loadInvoices,
  clearInvoiceCaches: paypal.clearInvoiceCaches,
}));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

const origin = "http://localhost:3000";
const unpaid = unpaidFixture as PayPalInvoice;
const id = unpaid.id;
const requestId = "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c";
const context = (invoiceId = id) => ({ params: Promise.resolve({ id: invoiceId }) });

function post(path: string, body: unknown): Request {
  return new Request(`${origin}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const cancelRequest = (body: unknown = { requestId }, invoiceId = id) =>
  cancel(post(`/api/invoices/${invoiceId}/cancel`, body), context(invoiceId) as never);

const recordRequest = (body: unknown, invoiceId = id) =>
  record(post(`/api/invoices/${invoiceId}/record-payment`, body), context(invoiceId) as never);

const payment = { requestId, method: "WIRE_TRANSFER", paidOn: "2026-11-03", note: " Wire " };

const withStatus = (status: PayPalInvoice["status"]): PayPalInvoice => ({ ...unpaid, status });

const TOO_LONG_ID = "A".repeat(101);

async function errorOf(response: Response): Promise<{ code: string; message: string }> {
  return (await response.json()).error;
}

beforeEach(() => {
  store = createMemoryStore();
  stubEnv({ DEMO_TODAY: "2026-11-05" });
  vi.resetAllMocks();
  paypal.getInvoice.mockResolvedValue(unpaid);
  paypal.cancelInvoice.mockResolvedValue(undefined);
  paypal.recordExternalPayment.mockResolvedValue(undefined);
  paypal.loadInvoices.mockResolvedValue([]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("POST /api/invoices/{id}/cancel", () => {
  it("cancels without emailing the client and clears the caches", async () => {
    const response = await cancelRequest();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cancelled: true, notified: false });
    expect(paypal.cancelInvoice).toHaveBeenCalledWith(id, { notifyClient: false });
    expect(paypal.clearInvoiceCaches).toHaveBeenCalledTimes(1);
  });

  it("emails the client only when asked", async () => {
    const response = await cancelRequest({ requestId, notifyClient: true });

    expect(await response.json()).toEqual({ cancelled: true, notified: true });
    expect(paypal.cancelInvoice).toHaveBeenCalledWith(id, { notifyClient: true });
  });

  it("answers a repeated request ID with the stored result, without calling PayPal again", async () => {
    await cancelRequest();
    const again = await cancelRequest();

    expect(again.status).toBe(200);
    expect(paypal.cancelInvoice).toHaveBeenCalledTimes(1);
  });

  it("refuses the same request ID for a different choice", async () => {
    await cancelRequest();
    const response = await cancelRequest({ requestId, notifyClient: true });

    expect(response.status).toBe(409);
    expect((await errorOf(response)).code).toBe("duplicate_request");
  });

  it.each(["PAID", "MARKED_AS_PAID", "CANCELLED", "DRAFT"] as const)(
    "answers 409 invalid_state for an invoice that is %s",
    async (status) => {
      paypal.getInvoice.mockResolvedValue(withStatus(status));
      const response = await cancelRequest();

      expect(response.status).toBe(409);
      expect((await errorOf(response)).code).toBe("invalid_state");
      expect(paypal.cancelInvoice).not.toHaveBeenCalled();
    },
  );

  it("says why a paid invoice cannot be cancelled", async () => {
    paypal.getInvoice.mockResolvedValue(withStatus("PAID"));
    expect((await errorOf(await cancelRequest())).message).toBe("This invoice is already paid.");
  });

  it("applies the demo guard only when the client would be emailed", async () => {
    const stranger: PayPalInvoice = {
      ...unpaid,
      primary_recipients: [{ billing_info: { email_address: "client@acme.example.org" } }],
    };
    paypal.getInvoice.mockResolvedValue(stranger);

    const emailed = await cancelRequest({ requestId, notifyClient: true });
    expect(emailed.status).toBe(403);
    expect((await errorOf(emailed)).code).toBe("recipient_not_allowed");
    expect(paypal.cancelInvoice).not.toHaveBeenCalled();

    const silent = await cancelRequest({
      requestId: "9d1f6c2a-7b3e-4c5d-8e9f-0a1b2c3d4e5f",
    });
    expect(silent.status).toBe(200);
  });

  it("releases the request ID when PayPal refuses, so a retry goes through", async () => {
    paypal.cancelInvoice.mockRejectedValueOnce(
      new PayPalApiError({
        status: 500,
        paypalName: "INTERNAL",
        message: "Down",
        debugId: "dbg-1",
      }),
    );
    const failed = await cancelRequest();
    expect(failed.status).toBe(502);
    expect((await failed.json()).error.debugId).toBe("dbg-1");

    expect((await cancelRequest()).status).toBe(200);
  });

  it("answers 404 for an unknown invoice and 400 for a bad body", async () => {
    paypal.getInvoice.mockRejectedValue(
      new PayPalApiError({ status: 404, paypalName: "INVALID_RESOURCE_ID", message: "Gone" }),
    );
    expect((await cancelRequest()).status).toBe(404);
    expect((await cancelRequest({ requestId: "nope" })).status).toBe(400);
  });

  it("refuses an invoice ID that cannot be one, without calling PayPal", async () => {
    const response = await cancelRequest({ requestId }, TOO_LONG_ID);
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toMatch(/^id: /);
    expect(paypal.getInvoice).not.toHaveBeenCalled();
  });
});

describe("POST /api/invoices/{id}/record-payment", () => {
  it("records the payment as made outside PayPal and clears the caches", async () => {
    const response = await recordRequest(payment);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ recorded: true, paidOn: "2026-11-03" });
    expect(paypal.recordExternalPayment).toHaveBeenCalledWith(id, {
      paymentDate: "2026-11-03",
      method: "WIRE_TRANSFER",
      note: "Wire",
    });
    expect(paypal.clearInvoiceCaches).toHaveBeenCalledTimes(1);
  });

  it("notes where a payment was recorded when no note is given", async () => {
    await recordRequest({ ...payment, note: undefined });
    expect(paypal.recordExternalPayment).toHaveBeenCalledWith(
      id,
      expect.objectContaining({ note: "Recorded in Dueline" }),
    );
  });

  it("accepts today and the invoice date, and refuses a day outside them", async () => {
    const edges = [
      ["2026-11-05", 200],
      ["2026-10-09", 200],
      ["2026-11-06", 400],
      ["2026-10-08", 400],
    ] as const;
    for (const [index, [paidOn, status]] of edges.entries()) {
      const response = await recordRequest({
        ...payment,
        paidOn,
        requestId: `3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b0${index}`,
      });
      expect(response.status, paidOn).toBe(status);
    }
  });

  it("explains a date in the future", async () => {
    const response = await recordRequest({ ...payment, paidOn: "2026-11-06" });
    expect((await errorOf(response)).message).toBe("The payment date cannot be in the future.");
  });

  it("answers a repeated request ID with the stored result", async () => {
    await recordRequest(payment);
    const again = await recordRequest(payment);

    expect(again.status).toBe(200);
    expect(paypal.recordExternalPayment).toHaveBeenCalledTimes(1);
  });

  it("refuses the same request ID for another payment", async () => {
    await recordRequest(payment);
    const response = await recordRequest({ ...payment, paidOn: "2026-11-04" });

    expect(response.status).toBe(409);
    expect((await errorOf(response)).code).toBe("duplicate_request");
  });

  it.each(["PAID", "MARKED_AS_PAID", "CANCELLED", "DRAFT"] as const)(
    "answers 409 invalid_state for an invoice that is %s",
    async (status) => {
      paypal.getInvoice.mockResolvedValue(withStatus(status));
      const response = await recordRequest(payment);

      expect(response.status).toBe(409);
      expect((await errorOf(response)).code).toBe("invalid_state");
      expect(paypal.recordExternalPayment).not.toHaveBeenCalled();
    },
  );

  it("validates the body", async () => {
    expect((await recordRequest({ ...payment, method: "CASH" })).status).toBe(400);
    expect((await recordRequest({ ...payment, paidOn: "yesterday" })).status).toBe(400);
    expect((await recordRequest({ ...payment, note: "x".repeat(201) })).status).toBe(400);
  });

  it("sends nothing to the client, so the demo guard has nothing to refuse", async () => {
    paypal.getInvoice.mockResolvedValue({
      ...unpaid,
      primary_recipients: [{ billing_info: { email_address: "client@acme.example.org" } }],
    });
    expect((await recordRequest(payment)).status).toBe(200);
  });
});

describe("GET /api/invoices/{id}", () => {
  it("returns the invoice, its history and the actions its status allows", async () => {
    await store.logReminder({
      invoiceId: id,
      tone: "gentle",
      sentAt: "2026-11-02T04:00:00.000Z",
      channel: "paypal",
    });
    paypal.getInvoice.mockResolvedValue({
      ...unpaid,
      items: [
        {
          name: "Pitch deck design",
          description: "SAC 998391",
          quantity: "2",
          unit_amount: { currency_code: "USD", value: "450.00" },
        },
      ],
    });
    const response = await detail(new Request(`${origin}/api/invoices/${id}`), context() as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.invoice).toMatchObject({ id, number: "INV-0101", dueState: "overdue" });
    expect(body.timeline.map((event: { kind: string }) => event.kind)).toEqual([
      "reminder",
      "overdue",
      "due",
      "created",
      "sent",
    ]);
    expect(body.reminders).toEqual([
      { tone: "gentle", sentAt: "2026-11-02T04:00:00.000Z", channel: "paypal" },
    ]);
    expect(body.details).toMatchObject({
      clientKey: "tandem-health",
      note: "Thank you for your business.",
      underLut: false,
      actions: { remind: true, recordPayment: true, cancel: true },
    });
    expect(body.details.items).toEqual([
      {
        name: "Pitch deck design",
        quantity: 2,
        unitAmount: { currency: "USD", value: "450.00" },
        sac: "998391",
      },
    ]);
  });

  it("offers no actions on a cancelled invoice, which still has a page", async () => {
    paypal.getInvoice.mockResolvedValue({
      ...withStatus("CANCELLED"),
      detail: {
        ...unpaid.detail,
        metadata: { ...unpaid.detail.metadata, last_update_time: "2026-11-01T06:00:00Z" },
      },
    });
    const body = await (
      await detail(new Request(`${origin}/api/invoices/${id}`), context() as never)
    ).json();

    expect(body.details.actions).toEqual({ remind: false, recordPayment: false, cancel: false });
    expect(body.timeline[0].kind).toBe("cancelled");
  });

  it("answers 404 for an unknown invoice", async () => {
    paypal.getInvoice.mockRejectedValue(
      new PayPalApiError({ status: 404, paypalName: "INVALID_RESOURCE_ID", message: "Gone" }),
    );
    const response = await detail(new Request(`${origin}/api/invoices/x`), context("x") as never);
    expect(response.status).toBe(404);
  });

  it("refuses an invoice ID that cannot be one", async () => {
    const response = await detail(
      new Request(`${origin}/api/invoices/${TOO_LONG_ID}`),
      context(TOO_LONG_ID) as never,
    );
    expect(response.status).toBe(400);
    expect(paypal.getInvoice).not.toHaveBeenCalled();
  });
});

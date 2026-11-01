import { beforeAll, describe, expect, it, vi } from "vitest";
import { PayPalApiError } from "@/lib/paypal/errors";
import { toPayPalInvoice } from "@/lib/paypal/invoice-body";
import {
  cancelInvoice,
  createDraftInvoice,
  deleteDraftInvoice,
  getInvoice,
  listInvoices,
  nextInvoiceNumber,
  recordExternalPayment,
  remindInvoice,
  sendInvoice,
} from "@/lib/paypal/invoices";
import { getActualPayout } from "@/lib/paypal/payments";
import { paypalFetch } from "@/lib/paypal/rest";
import { OFFLINE_WEBHOOK_SIGNATURE } from "@/lib/paypal/offline/transport";
import { offlinePayPal } from "@/lib/paypal/offline/world";
import { getAccessToken } from "@/lib/paypal/token";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { verifyWebhook } from "@/lib/paypal/webhooks";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { EMPTY_PROFILE } from "@/types";
import { stubEnv } from "../support/env";

const holder = vi.hoisted(() => ({ store: undefined as Store | undefined }));
vi.mock("@/lib/store", () => ({ getStore: () => holder.store }));

const TODAY = "2026-11-04";
const BUYER = "buyer@personal.example.com";

function draftBody(requestId: string) {
  return toPayPalInvoice(
    {
      client: { name: "Acme Studio", email: BUYER },
      currency: "USD",
      dueOn: "2026-11-18",
      items: [
        { name: "Logo", quantity: 2, unitAmount: "120.00", sac: "998391" },
        { name: "Revision", quantity: 1, unitAmount: "45.50", sac: "998391" },
      ],
      purposeCode: "P1099",
      includeLutNote: false,
    },
    {
      invoiceNumber: "INV-9001",
      invoiceDate: TODAY,
      requestId,
      profile: EMPTY_PROFILE,
      discount: { percent: 10, withinDays: 7 },
    },
  );
}

async function expectPayPalError(promise: Promise<unknown>, status: number): Promise<void> {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(PayPalApiError);
  expect((error as PayPalApiError).status).toBe(status);
}

beforeAll(() => {
  holder.store = createMemoryStore();
  stubEnv({ DUELINE_OFFLINE: "true", DEMO_TODAY: TODAY });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("offline PayPal", () => {
  it("seeds the demo story and the PayPal-paid invoices once, however many ask first", async () => {
    const [first, second] = await Promise.all([listInvoices(), listInvoices()]);
    expect(first).toHaveLength(13);
    expect(second).toHaveLength(13);

    const statuses = first.map((invoice) => invoice.status).sort();
    expect(statuses.filter((status) => status === "SENT")).toHaveLength(4);
    expect(statuses.filter((status) => status === "PAID")).toHaveLength(4);
    expect(statuses.filter((status) => status === "MARKED_AS_PAID")).toHaveLength(5);
  });

  it("saves the demo profile for the freelancer", async () => {
    expect((await holder.store?.getProfile())?.yourName).toBe("Riya Sharma");
  });

  it("takes any access token without calling PayPal", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    expect(await getAccessToken()).toBe("offline-token");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("creates a draft with its total, then sends it with a payer link", async () => {
    const number = await nextInvoiceNumber();
    expect(number).toMatch(/^INV-\d+$/);

    const draft = await createDraftInvoice(draftBody("req-1"), "req-1");
    expect(draft.status).toBe("DRAFT");
    // 2 x 120.00 + 45.50 = 285.50, less the 10% invoice discount.
    expect(draft.amount).toEqual({ currency_code: "USD", value: "256.95" });

    await sendInvoice(draft.id, "req-1");
    const sent = await getInvoice(draft.id);
    expect(sent.status).toBe("SENT");
    expect(sent.detail.metadata?.recipient_view_url).toContain(draft.id);
    expect(sent.detail.metadata?.first_sent_time).toBeDefined();
  });

  it("reminds and cancels a sent invoice and deletes a draft", async () => {
    const sent = await createDraftInvoice(draftBody("req-2"), "req-2");
    await sendInvoice(sent.id, "req-2");
    await remindInvoice(sent.id);
    expect((await offlinePayPal()).calls.reminded).toContain(sent.id);
    await cancelInvoice(sent.id);
    expect((await getInvoice(sent.id)).status).toBe("CANCELLED");

    const draft = await createDraftInvoice(draftBody("req-3"), "req-3");
    await deleteDraftInvoice(draft.id);
    await expectPayPalError(getInvoice(draft.id), 404);
  });

  it("marks an invoice as paid when a payment is recorded outside PayPal", async () => {
    const sent = await createDraftInvoice(draftBody("req-4"), "req-4");
    await sendInvoice(sent.id, "req-4");
    await recordExternalPayment(sent.id, { paymentDate: TODAY, note: "Bank transfer" });
    expect((await getInvoice(sent.id)).status).toBe("MARKED_AS_PAID");
  });

  it("answers PayPal's own figures for a payment made through PayPal, and none otherwise", async () => {
    const invoices = await listInvoices();
    const paid = invoices.find((invoice) => invoice.status === "PAID") as PayPalInvoice;
    const payout = await getActualPayout(paid);
    expect(payout?.source).toBe("paypal_capture");
    expect(payout?.netInr).toBeGreaterThan(0);
    expect(payout?.transactionId).toBe(paid.payments?.transactions?.[0].payment_id);

    const outside = invoices.find((invoice) => invoice.status === "MARKED_AS_PAID");
    expect(await getActualPayout(outside as PayPalInvoice)).toBeNull();
  });

  it("verifies a webhook only when it carries the offline signature", async () => {
    const headers = (signature: string) =>
      new Headers({
        "paypal-transmission-id": "tx-1",
        "paypal-transmission-time": "2026-11-04T10:00:00Z",
        "paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1",
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-transmission-sig": signature,
      });
    expect(await verifyWebhook('{"id":"WH-1"}', headers(OFFLINE_WEBHOOK_SIGNATURE))).toBe(true);
    expect(await verifyWebhook('{"id":"WH-1"}', headers("something-else"))).toBe(false);
  });

  it("answers 404 for a call it does not know", async () => {
    await expectPayPalError(paypalFetch("/v2/unknown", { method: "POST" }), 404);
  });
});

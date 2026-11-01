import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getActivity } from "@/app/api/activity/route";
import { POST as webhook } from "@/app/api/webhooks/paypal/route";
import { clearInvoiceCaches } from "@/lib/paypal/summaries";
import { clearAccessToken } from "@/lib/paypal/token";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { getStore } from "@/lib/store";
import { activity } from "@/mocks/fixtures";
import { stubEnv } from "../support/env";
import { jsonResponse, mockPayPal, callsTo } from "../support/http";
import paidFixture from "../fixtures/paypal/invoice-paid.json";
import nestedPaidFixture from "../fixtures/paypal/webhook-invoice-paid.json";

const sdk = vi.hoisted(() => ({ getCapturedPayment: vi.fn(), searchTransactions: vi.fn() }));

vi.mock("@/lib/paypal/sdk", () => ({
  paymentsController: () => ({ getCapturedPayment: sdk.getCapturedPayment }),
  transactionSearchController: () => ({ searchTransactions: sdk.searchTransactions }),
}));

vi.mock("@/lib/paypal/summaries", () => ({ clearInvoiceCaches: vi.fn() }));

const paid = paidFixture as PayPalInvoice;
const nestedPaid = nestedPaidFixture;
const VERIFY_PATH = "/v1/notifications/verify-webhook-signature";
const INVOICE_PATH = `/v2/invoicing/invoices/${paid.id}`;

const signatureHeaders = {
  "paypal-transmission-id": "tx-1",
  "paypal-transmission-time": "2026-10-29T10:00:00Z",
  "paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1",
  "paypal-auth-algo": "SHA256withRSA",
  "paypal-transmission-sig": "c2ln",
};

// Odd spacing and number formatting on purpose: only the received text will reproduce them.
function rawEvent(id: string, type: string): string {
  return `{"id":"${id}",  "event_type":"${type}","create_time":"2026-10-29T10:00:00.000Z", "resource":{"id":"${paid.id}","n":1.10}}`;
}

function delivery(body: string, headers: Record<string, string> = signatureHeaders): Request {
  return new Request("http://localhost:3000/api/webhooks/paypal", {
    method: "POST",
    headers,
    body,
  });
}

type Handler = Parameters<typeof mockPayPal>[0];

function servePayPal(status: "SUCCESS" | "FAILURE", invoice: Handler = () => jsonResponse(paid)) {
  return mockPayPal((url, init) => {
    if (url.pathname === VERIFY_PATH) return jsonResponse({ verification_status: status });
    return invoice(url, init);
  });
}

function capturedPayout(): void {
  sdk.getCapturedPayment.mockResolvedValue({
    result: {
      sellerReceivableBreakdown: {
        paypalFee: { currencyCode: "USD", value: "20.10" },
        netAmount: { currencyCode: "USD", value: "429.90" },
        receivableAmount: { currencyCode: "INR", value: "35617.00" },
      },
    },
  });
}

beforeEach(() => {
  stubEnv({ PAYPAL_WEBHOOK_ID: "WH-ID", DEMO_TODAY: "2026-10-29", DEMO_MODE: "false" });
  clearAccessToken();
  vi.mocked(clearInvoiceCaches).mockClear();
  sdk.getCapturedPayment.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("POST /api/webhooks/paypal verification", () => {
  it("answers 400 invalid_webhook when a signature header is missing", async () => {
    const fetchSpy = servePayPal("SUCCESS");
    const incomplete = Object.fromEntries(
      Object.entries(signatureHeaders).filter(([name]) => name !== "paypal-cert-url"),
    );

    const response = await webhook(
      delivery(rawEvent("WH-A1", "INVOICING.INVOICE.PAID"), incomplete),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_webhook");
    expect(callsTo(fetchSpy, VERIFY_PATH)).toBe(0);
  });

  it("answers 400 invalid_webhook when PayPal reports FAILURE, as it does for simulator events", async () => {
    servePayPal("FAILURE");
    const response = await webhook(delivery(rawEvent("WH-A2", "INVOICING.INVOICE.PAID")));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_webhook");
    expect(await getStore().isProcessed("WH-A2")).toBe(false);
  });

  it("answers 400 when no webhook ID is configured, without calling PayPal", async () => {
    stubEnv({ PAYPAL_WEBHOOK_ID: "" });
    const fetchSpy = servePayPal("SUCCESS");
    const response = await webhook(delivery(rawEvent("WH-A3", "INVOICING.INVOICE.PAID")));
    expect(response.status).toBe(400);
    expect(callsTo(fetchSpy, VERIFY_PATH)).toBe(0);
  });

  it("refuses a body that is not one JSON value, so it cannot add fields to the postback", async () => {
    const fetchSpy = servePayPal("SUCCESS");
    const response = await webhook(delivery('{"id":"x"}, "webhook_id": "other"'));
    expect(response.status).toBe(400);
    expect(callsTo(fetchSpy, VERIFY_PATH)).toBe(0);
  });

  it("answers 400 for a body over 100 KB", async () => {
    const fetchSpy = servePayPal("SUCCESS");
    const response = await webhook(delivery(`{"pad":"${"x".repeat(100 * 1024)}"}`));
    expect(response.status).toBe(400);
    expect(callsTo(fetchSpy, VERIFY_PATH)).toBe(0);
  });

  it("sends PayPal the received body byte for byte with the headers and webhook ID", async () => {
    const fetchSpy = servePayPal("SUCCESS");
    const raw = rawEvent("WH-A4", "INVOICING.INVOICE.CREATED");

    expect((await webhook(delivery(raw))).status).toBe(204);

    const call = fetchSpy.mock.calls.find(([input]) => String(input).endsWith(VERIFY_PATH));
    const sent = String(call?.[1]?.body);
    expect(sent).toContain(`"webhook_event":${raw}}`);
    expect(JSON.parse(sent)).toMatchObject({
      auth_algo: "SHA256withRSA",
      cert_url: signatureHeaders["paypal-cert-url"],
      transmission_id: "tx-1",
      transmission_sig: "c2ln",
      transmission_time: "2026-10-29T10:00:00Z",
      webhook_id: "WH-ID",
    });
  });
});

describe("POST /api/webhooks/paypal processing", () => {
  it("re-reads a paid invoice, stores the payout, records one activity event and clears the caches", async () => {
    capturedPayout();
    const fetchSpy = servePayPal("SUCCESS");

    const response = await webhook(delivery(rawEvent("WH-B1", "INVOICING.INVOICE.PAID")));

    expect(response.status).toBe(204);
    expect(callsTo(fetchSpy, INVOICE_PATH)).toBe(1);
    expect(clearInvoiceCaches).toHaveBeenCalledTimes(1);
    expect((await getStore().getActualPayout(paid.id))?.netInr).toBe(35617);
    expect(await getStore().isProcessed("WH-B1")).toBe(true);

    const events = (await (await getActivity()).json()).events;
    expect(events.filter((event: { id: string }) => event.id === "WH-B1")).toEqual([
      {
        id: "WH-B1",
        kind: "paid",
        invoiceId: paid.id,
        invoiceNumber: "INV-0102",
        clientName: "Mike Halden",
        at: "2026-10-29T10:00:00.000Z",
        amount: { currency: "USD", value: "450.00" },
      },
    ]);
  });

  it("reads the invoice from resource.invoice, as PayPal sends it, and records one paid activity", async () => {
    capturedPayout();
    const nestedId = nestedPaid.resource.invoice.id;
    const fetchSpy = servePayPal("SUCCESS", (url) =>
      url.pathname === `/v2/invoicing/invoices/${nestedId}`
        ? jsonResponse({ ...paid, id: nestedId })
        : jsonResponse({ name: "RESOURCE_NOT_FOUND" }, { status: 404 }),
    );

    expect((await webhook(delivery(JSON.stringify(nestedPaid)))).status).toBe(204);

    expect(nestedId).toBe("INV2-UADS-A9WN-A3E8-7XYH");
    expect(callsTo(fetchSpy, `/v2/invoicing/invoices/${nestedId}`)).toBe(1);
    const events = (await getStore().latestActivity(50)).filter(
      (event) => event.id === nestedPaid.id,
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "paid", invoiceId: nestedId });
    expect(await getStore().isProcessed(nestedPaid.id)).toBe(true);
  });

  it("marks an invoicing event with no invoice id as processed without calling PayPal", async () => {
    const fetchSpy = servePayPal("SUCCESS");
    const raw = '{"id":"WH-B7","event_type":"INVOICING.INVOICE.PAID","resource":{"invoice":{}}}';

    expect((await webhook(delivery(raw))).status).toBe(204);

    const invoiceCalls = fetchSpy.mock.calls.filter(([input]) =>
      String(input).includes("/v2/invoicing/"),
    );
    expect(invoiceCalls).toHaveLength(0);
    expect(await getStore().isProcessed("WH-B7")).toBe(true);
    expect(console.warn).toHaveBeenCalledWith("Verified webhook ignored", {
      eventType: "INVOICING.INVOICE.PAID",
      reason: "missing_invoice_id",
    });
  });

  it("does the work once when the same event arrives twice", async () => {
    capturedPayout();
    const fetchSpy = servePayPal("SUCCESS");
    const raw = rawEvent("WH-B2", "INVOICING.INVOICE.PAID");

    expect((await webhook(delivery(raw))).status).toBe(204);
    expect((await webhook(delivery(raw))).status).toBe(204);

    expect(callsTo(fetchSpy, INVOICE_PATH)).toBe(1);
    expect(clearInvoiceCaches).toHaveBeenCalledTimes(1);
    const events = (await getStore().latestActivity(50)).filter((event) => event.id === "WH-B2");
    expect(events).toHaveLength(1);
  });

  it("records a sent event without looking for a payout", async () => {
    servePayPal("SUCCESS", () => jsonResponse({ ...paid, status: "SENT" }));

    expect((await webhook(delivery(rawEvent("WH-B3", "INVOICING.INVOICE.SENT")))).status).toBe(204);

    expect(sdk.getCapturedPayment).not.toHaveBeenCalled();
    const sent = (await getStore().latestActivity(50)).find((event) => event.id === "WH-B3");
    expect(sent?.kind).toBe("sent");
  });

  it("dates a demo-story invoice's sent event by its invoice date and its paid event by its payment date", async () => {
    capturedPayout();
    const story = {
      ...paid,
      status: "MARKED_AS_PAID" as const,
      detail: { ...paid.detail, memo: "dueline-demo:okafor-logo-refresh" },
    };
    servePayPal("SUCCESS", () => jsonResponse(story));

    await webhook(delivery(rawEvent("WH-S1", "INVOICING.INVOICE.SENT")));
    await webhook(delivery(rawEvent("WH-S2", "INVOICING.INVOICE.PAID")));

    const events = await getStore().latestActivity(50);
    const at = (id: string) => events.find((event) => event.id === id)?.at;
    // The invoice is dated 2 Oct and paid on 15 Oct; both events happen at 09:00 India time. A story
    // invoice's rows have the seed's ids, so a webhook adds no second row.
    expect(at("demo:0:okafor-logo-refresh:sent")).toBe("2026-10-02T03:30:00.000Z");
    expect(at("demo:0:okafor-logo-refresh:paid")).toBe("2026-10-15T03:30:00.000Z");
    expect(events.some(({ id }) => id === "WH-S1" || id === "WH-S2")).toBe(false);
  });

  it("adds no second row for a story invoice whose sent and paid rows the seed already wrote", async () => {
    capturedPayout();
    const story = {
      ...paid,
      detail: { ...paid.detail, memo: "dueline-demo:2:okafor-logo-refresh" },
    };
    servePayPal("SUCCESS", () => jsonResponse(story));
    const row = {
      ...activity[0],
      id: "demo:2:okafor-logo-refresh:sent",
      kind: "sent" as const,
      at: "2026-10-02T03:30:00.000Z",
    };
    await getStore().addActivity(row);

    await webhook(delivery(rawEvent("WH-S5", "INVOICING.INVOICE.SENT")));

    const rows = (await getStore().latestActivity(50)).filter(({ id }) => id === row.id);
    expect(rows).toEqual([row]);
  });

  it("never places a demo-story event after the moment PayPal reported it", async () => {
    const story = {
      ...paid,
      status: "SENT",
      detail: { ...paid.detail, invoice_date: "2026-10-29", memo: "dueline-demo:tandem" },
    };
    servePayPal("SUCCESS", () => jsonResponse(story));

    await webhook(delivery(rawEvent("WH-S3", "INVOICING.INVOICE.SENT")));

    const sent = (await getStore().latestActivity(50)).find((event) => event.id.endsWith(":sent"));
    expect(sent?.at).toBe("2026-10-29T03:30:00.000Z");
  });

  it("keeps the reported time for an invoice that is not part of the story", async () => {
    servePayPal("SUCCESS", () => jsonResponse({ ...paid, status: "SENT" }));

    await webhook(delivery(rawEvent("WH-S4", "INVOICING.INVOICE.SENT")));

    const sent = (await getStore().latestActivity(50)).find((event) => event.id === "WH-S4");
    expect(sent?.at).toBe("2026-10-29T10:00:00.000Z");
  });

  it("refreshes the invoice for other invoice events but records nothing", async () => {
    const fetchSpy = servePayPal("SUCCESS");

    expect((await webhook(delivery(rawEvent("WH-B4", "INVOICING.INVOICE.CANCELLED")))).status).toBe(
      204,
    );

    expect(callsTo(fetchSpy, INVOICE_PATH)).toBe(1);
    expect(clearInvoiceCaches).toHaveBeenCalledTimes(1);
    expect((await getStore().latestActivity(50)).some((event) => event.id === "WH-B4")).toBe(false);
  });

  it("answers 204 for an event type Dueline ignores, without reading an invoice", async () => {
    const fetchSpy = servePayPal("SUCCESS");

    expect((await webhook(delivery(rawEvent("WH-B5", "PAYMENT.CAPTURE.COMPLETED")))).status).toBe(
      204,
    );

    expect(callsTo(fetchSpy, INVOICE_PATH)).toBe(0);
    expect(await getStore().isProcessed("WH-B5")).toBe(true);
  });

  it("answers 204 and does nothing for a verified body that is not an event", async () => {
    const fetchSpy = servePayPal("SUCCESS");

    expect((await webhook(delivery('{"event_type":"INVOICING.INVOICE.PAID"}'))).status).toBe(204);

    expect(callsTo(fetchSpy, INVOICE_PATH)).toBe(0);
  });

  it("answers 500 and lets PayPal retry when PayPal fails after verification", async () => {
    servePayPal("SUCCESS", () =>
      jsonResponse(
        { name: "INTERNAL_SERVER_ERROR", message: "Try later.", debug_id: "dbg-9" },
        { status: 500 },
      ),
    );

    const response = await webhook(delivery(rawEvent("WH-B6", "INVOICING.INVOICE.PAID")));

    expect(response.status).toBe(500);
    expect(await getStore().isProcessed("WH-B6")).toBe(false);
    expect(console.error).toHaveBeenCalledWith("Webhook processing failed", {
      name: "PayPalApiError",
      debugId: "dbg-9",
    });
  });
});

describe("GET /api/activity", () => {
  it("returns the latest 20 stored events, newest first", async () => {
    const store = getStore();
    for (let index = 0; index < 25; index++) {
      const minute = String(index).padStart(2, "0");
      await store.addActivity({
        ...activity[0],
        id: `act-${minute}`,
        at: `2026-11-01T10:${minute}:00Z`,
      });
    }

    const response = await getActivity();
    const { events } = await response.json();

    expect(events).toHaveLength(20);
    expect(events[0].id).toBe("act-24");
    expect(events[19].id).toBe("act-05");
    const times = events.map((event: { at: string }) => event.at);
    expect(times).toEqual([...times].sort().reverse());
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PUT as putLanguage } from "@/app/api/clients/by-key/[key]/language/route";
import { GET as getClient } from "@/app/api/clients/by-key/[key]/route";
import { GET as cron } from "@/app/api/cron/daily/route";
import { POST as prepare } from "@/app/api/demo/prepare/route";
import { GET as getDigest } from "@/app/api/digest/route";
import { DELETE as deleteItem } from "@/app/api/items/[id]/route";
import { GET as listItems, POST as saveItem } from "@/app/api/items/route";
import { POST as dismiss } from "@/app/api/queue/[id]/dismiss/route";
import { GET as getQueue } from "@/app/api/queue/route";
import { GET as getRateAlerts } from "@/app/api/rate-alerts/route";
import { DELETE as deleteRepeat, PATCH as patchRepeat } from "@/app/api/repeats/[id]/route";
import { GET as listRepeats, POST as postRepeat } from "@/app/api/repeats/route";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { DEFAULT_SETTINGS, type RepeatSchedule } from "@/types";
import { stubEnv } from "../support/env";
import { jsonResponse } from "../support/http";
import { ecbResponse } from "../support/rates";
import { OKAFOR, overdueInvoice, paidInvoice } from "../support/summaries";
import "../support/next-server";

const paypal = vi.hoisted(() => ({
  loadInvoices: vi.fn(),
  clearInvoiceCaches: vi.fn(),
  getInvoiceDetail: vi.fn(),
}));
vi.mock("@/lib/paypal/summaries", () => ({
  loadInvoices: paypal.loadInvoices,
  clearInvoiceCaches: paypal.clearInvoiceCaches,
}));
vi.mock("@/lib/payouts/load-summaries", () => ({
  loadSummaries: async () => (await paypal.loadInvoices()).map(({ summary }: never) => summary),
}));
vi.mock("@/lib/invoices/invoice-detail", () => ({ getInvoiceDetail: paypal.getInvoiceDetail }));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

const origin = "http://localhost:3000";
const SECRET = "0123456789abcdef0123";
const requestId = "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c";
const overdue = overdueInvoice("2026-10-26", 10, OKAFOR);

function call(path: string, init: { method?: string; body?: unknown; headers?: HeadersInit } = {}) {
  return new Request(`${origin}${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

const idContext = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
const keyContext = (key: string) => ({ params: Promise.resolve({ key }) }) as never;

beforeEach(() => {
  store = createMemoryStore();
  stubEnv({ DEMO_TODAY: "2026-11-05", CRON_SECRET: SECRET });
  Object.values(paypal).forEach((mock) => mock.mockReset());
  paypal.loadInvoices.mockResolvedValue(
    [overdue, paidInvoice("2026-10-01", "2026-11-04")].map((summary) => ({
      summary,
      amountDue: summary.amount,
      underLut: false,
      sac: null,
      paymentId: null,
      marker: "dueline-request:test",
    })),
  );
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
    new URL(String(input)).searchParams.has("from") ? jsonResponse([]) : ecbResponse("2026-11-04"),
  );
});

afterEach(() => vi.restoreAllMocks());

describe("GET /api/cron/daily", () => {
  const authorised = { headers: { authorization: `Bearer ${SECRET}` } };

  it("answers 401 without the secret, with a wrong one, or when none is configured", async () => {
    expect((await cron(call("/api/cron/daily"))).status).toBe(401);
    expect(
      (await cron(call("/api/cron/daily", { headers: { authorization: "Bearer wrong" } }))).status,
    ).toBe(401);

    stubEnv({ DEMO_TODAY: "2026-11-05" });
    expect((await cron(call("/api/cron/daily", authorised))).status).toBe(401);
    expect(paypal.loadInvoices).not.toHaveBeenCalled();
  });

  it("prepares the day once and says whether it ran", async () => {
    const first = await cron(call("/api/cron/daily", authorised));
    expect(first.status).toBe(200);
    const body = await first.json();
    expect(body.ran).toBe(true);
    expect(body.digest.preparedDrafts).toBe(1);

    const second = await (await cron(call("/api/cron/daily", authorised))).json();
    expect(second.ran).toBe(false);
    expect(second.digest.preparedDrafts).toBe(1);
  });
});

describe("POST /api/demo/prepare", () => {
  it("runs the same preparation in demo mode", async () => {
    const body = await (await prepare()).json();
    expect(body.ran).toBe(true);
    expect((await (await getQueue()).json()).items).toHaveLength(1);
    expect((await (await prepare()).json()).ran).toBe(false);
  });

  it("answers 404 outside demo mode", async () => {
    stubEnv({ DEMO_MODE: "false" });
    const response = await prepare();
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("not_found");
  });
});

describe("the queue", () => {
  it("lists the queue and dismisses an item", async () => {
    await prepare();
    const { items } = await (await getQueue()).json();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "reminder", invoiceId: overdue.id });

    const response = await dismiss(
      call(`/api/queue/${items[0].id}/dismiss`, { method: "POST" }),
      idContext(items[0].id),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ dismissed: true });
    expect((await (await getQueue()).json()).items).toEqual([]);
  });

  it("answers 404 for an item that is not in the queue", async () => {
    const response = await dismiss(
      call("/api/queue/nope/dismiss", { method: "POST" }),
      idContext("nope"),
    );
    expect(response.status).toBe(404);
  });
});

describe("GET /api/digest and /api/rate-alerts", () => {
  it("answers a digest even before the run, and the alerts that are triggered", async () => {
    await store.saveSettings({
      ...DEFAULT_SETTINGS,
      rateAlerts: [
        { currency: "USD", direction: "above", threshold: 80 },
        { currency: "EUR", direction: "below", threshold: 90 },
      ],
    });
    const digest = await (await getDigest()).json();
    expect(digest.day).toBe("2026-11-05");
    expect(digest.rateAlerts).toHaveLength(1);

    expect(await (await getRateAlerts()).json()).toEqual({
      alerts: [{ currency: "USD", direction: "above", threshold: 80, rate: 85 }],
    });
  });
});

describe("the item library routes", () => {
  const logo = { name: "Logo option", unitAmount: "120.00", currency: "USD", sac: "998391" };

  it("saves, lists, renames and deletes an item", async () => {
    const saved = await (await saveItem(call("/api/items", { method: "POST", body: logo }))).json();
    expect(saved).toMatchObject(logo);

    const renamed = await (
      await saveItem(
        call("/api/items", { method: "POST", body: { ...saved, name: "Logo concept" } }),
      )
    ).json();
    expect(renamed.id).toBe(saved.id);
    expect((await (await listItems()).json()).items).toHaveLength(1);

    expect(
      (await deleteItem(call(`/api/items/${saved.id}`, { method: "DELETE" }), idContext(saved.id)))
        .status,
    ).toBe(204);
    expect((await (await listItems()).json()).items).toEqual([]);
  });

  it("refuses a bad item with 400 and names the field", async () => {
    const response = await saveItem(
      call("/api/items", { method: "POST", body: { ...logo, unitAmount: "free" } }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toContain("unitAmount");
  });

  it("answers 404 for an item that is gone and 400 for an ID that is not a UUID", async () => {
    const gone = "7a1c9d52-3b8e-4f60-a2d4-5e6f708192a3";
    expect(
      (await deleteItem(call(`/api/items/${gone}`, { method: "DELETE" }), idContext(gone))).status,
    ).toBe(404);
    expect(
      (await deleteItem(call("/api/items/x", { method: "DELETE" }), idContext("x"))).status,
    ).toBe(400);
  });
});

describe("the repeat routes", () => {
  function serveDetail(): void {
    paypal.getInvoiceDetail.mockResolvedValue({
      invoice: paidInvoice("2026-10-01", "2026-10-05", OKAFOR),
      details: {
        clientKey: "okafor-reyes",
        underLut: false,
        note: "",
        actions: { remind: false, recordPayment: false, cancel: false },
        items: [
          {
            name: "Retainer",
            quantity: 1,
            unitAmount: { currency: "EUR", value: "500.00" },
            sac: null,
          },
        ],
      },
    });
  }

  it("saves a schedule from an invoice, lists it for the client, pauses and deletes it", async () => {
    serveDetail();
    const created = await postRepeat(
      call("/api/repeats", {
        method: "POST",
        body: { invoiceId: "INV2-1", dayOfMonth: 10, requestId },
      }),
    );
    expect(created.status).toBe(200);
    const repeat: RepeatSchedule = await created.json();
    expect(repeat).toMatchObject({ id: requestId, nextOn: "2026-11-10", paused: false });

    const listed = await (await listRepeats(call("/api/repeats?client=okafor-reyes"))).json();
    expect(listed.repeats).toHaveLength(1);
    expect((await (await listRepeats(call("/api/repeats?client=other"))).json()).repeats).toEqual(
      [],
    );

    const paused = await patchRepeat(
      call(`/api/repeats/${requestId}`, { method: "PATCH", body: { paused: true } }),
      idContext(requestId),
    );
    expect((await paused.json()).paused).toBe(true);

    const removed = await deleteRepeat(
      call(`/api/repeats/${requestId}`, { method: "DELETE" }),
      idContext(requestId),
    );
    expect(removed.status).toBe(204);
    expect((await (await listRepeats(call("/api/repeats"))).json()).repeats).toEqual([]);
  });

  it("refuses a day outside 1 to 28", async () => {
    for (const dayOfMonth of [0, 29, 1.5]) {
      const response = await postRepeat(
        call("/api/repeats", {
          method: "POST",
          body: { invoiceId: "INV2-1", dayOfMonth, requestId },
        }),
      );
      expect(response.status).toBe(400);
    }
  });

  it("answers 404 for a schedule that is not there", async () => {
    const response = await patchRepeat(
      call(`/api/repeats/${requestId}`, { method: "PATCH", body: { paused: true } }),
      idContext(requestId),
    );
    expect(response.status).toBe(404);
  });
});

describe("a client's reminder language", () => {
  it("is saved and shown on the client page", async () => {
    const saved = await putLanguage(
      call("/api/clients/by-key/okafor-reyes/language", {
        method: "PUT",
        body: { language: "de" },
      }),
      keyContext("okafor-reyes"),
    );
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({ language: "de" });

    const detail = await (
      await getClient(call("/api/clients/by-key/okafor-reyes"), keyContext("okafor-reyes"))
    ).json();
    expect(detail.language).toBe("de");
  });

  it("refuses a language that is not offered, and a client that does not exist", async () => {
    const bad = await putLanguage(
      call("/api/clients/by-key/okafor-reyes/language", {
        method: "PUT",
        body: { language: "xx" },
      }),
      keyContext("okafor-reyes"),
    );
    expect(bad.status).toBe(400);

    const missing = await putLanguage(
      call("/api/clients/by-key/nobody/language", { method: "PUT", body: { language: "fr" } }),
      keyContext("nobody"),
    );
    expect(missing.status).toBe(404);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { describeEvent } from "@/components/receivables/activity-text";
import { DELETE as remove, PUT as put } from "@/app/api/invoices/[id]/promise/route";
import { POST as cancel } from "@/app/api/invoices/[id]/cancel/route";
import { POST as record } from "@/app/api/invoices/[id]/record-payment/route";
import { todayInKolkata } from "@/lib/date-math";
import { buildTimeline } from "@/lib/invoices/timeline";
import { withPromises } from "@/lib/promises/attach-promises";
import { clearSettledPromises } from "@/lib/promises/promises";
import { isPromiseDateAllowed, promiseRange } from "@/lib/promises/promise-range";
import { PayPalApiError } from "@/lib/paypal/errors";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { listReminderDrafts, prepareReminderDrafts } from "@/lib/reminders/reminder-drafts";
import { scoreClient } from "@/lib/risk/score";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store, StoredPromise } from "@/lib/store/store";
import { EMPTY_PROFILE, type InvoiceSummary } from "@/types";
import { stubEnv } from "../support/env";
import { ecbResponse, isRatesRequest } from "../support/rates";
import { OKAFOR, overdueInvoice, paidInvoice } from "../support/summaries";
import unpaidFixture from "../fixtures/paypal/invoice-unpaid.json";
import "../support/next-server";

const paypal = vi.hoisted(() => ({
  getInvoice: vi.fn(),
  cancelInvoice: vi.fn(),
  recordExternalPayment: vi.fn(),
  loadInvoices: vi.fn(),
  refreshSnapshotNow: vi.fn(),
}));

vi.mock("@/lib/paypal/invoices", () => ({
  getInvoice: paypal.getInvoice,
  cancelInvoice: paypal.cancelInvoice,
  recordExternalPayment: paypal.recordExternalPayment,
}));
vi.mock("@/lib/paypal/summaries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/paypal/summaries")>()),
  loadInvoices: paypal.loadInvoices,
  refreshSnapshotNow: paypal.refreshSnapshotNow,
}));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

const TODAY = "2026-11-05";
const unpaid = unpaidFixture as PayPalInvoice;
const id = unpaid.id;
const requestId = "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c";
const context = (invoiceId = id) => ({ params: Promise.resolve({ id: invoiceId }) });

const send = (method: "PUT" | "DELETE", body?: unknown, invoiceId = id) => {
  const request = new Request(`http://localhost:3000/api/invoices/${invoiceId}/promise`, {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return method === "PUT"
    ? put(request, context(invoiceId) as never)
    : remove(request, context(invoiceId) as never);
};

const stored = (invoiceId: string, promisedOn = "2026-11-10"): StoredPromise => ({
  invoiceId,
  promisedOn,
  note: "",
  createdAt: "2026-11-05T05:00:00.000Z",
});

const loadedOf = (summary: InvoiceSummary) => ({
  summary,
  amountDue: summary.amount,
  underLut: false,
  marker: "dueline-request:test",
  sac: null,
  paymentId: null,
});

beforeEach(() => {
  store = createMemoryStore();
  // The unpaid invoice fell due on 30 Oct, so on 5 Nov it is late.
  stubEnv({ DEMO_TODAY: TODAY });
  vi.resetAllMocks();
  paypal.getInvoice.mockResolvedValue(unpaid);
  paypal.cancelInvoice.mockResolvedValue(undefined);
  paypal.recordExternalPayment.mockResolvedValue(undefined);
  paypal.loadInvoices.mockResolvedValue([]);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (isRatesRequest(url)) return ecbResponse();
    throw new Error(`Unexpected request to ${url.host}`);
  });
});

afterEach(() => vi.restoreAllMocks());

describe("the range of a promised date", () => {
  it("is today to 60 days ahead, both ends included", () => {
    expect(promiseRange("2026-11-05")).toEqual({ min: "2026-11-05", max: "2027-01-04" });
    expect(isPromiseDateAllowed("2026-11-05", "2026-11-05")).toBe(true);
    expect(isPromiseDateAllowed("2027-01-04", "2026-11-05")).toBe(true);
    expect(isPromiseDateAllowed("2026-11-04", "2026-11-05")).toBe(false);
    expect(isPromiseDateAllowed("2027-01-05", "2026-11-05")).toBe(false);
  });

  it("moves at midnight in India, not at midnight UTC", () => {
    // 23:59 in India on 4 November is 18:29 UTC; two minutes later it is 5 November there.
    const before = todayInKolkata(new Date("2026-11-04T18:29:00Z"));
    const after = todayInKolkata(new Date("2026-11-04T18:31:00Z"));
    expect([before, after]).toEqual(["2026-11-04", "2026-11-05"]);
    expect(isPromiseDateAllowed("2026-11-04", before)).toBe(true);
    expect(isPromiseDateAllowed("2026-11-04", after)).toBe(false);
    expect(isPromiseDateAllowed("2027-01-03", before)).toBe(true);
    expect(isPromiseDateAllowed("2027-01-03", after)).toBe(true);
    expect(isPromiseDateAllowed("2027-01-04", before)).toBe(false);
  });
});

describe("the range of a promised date across a month end", () => {
  it("counts 60 days over the month boundary, and the day after is the 1st", () => {
    expect(promiseRange("2026-11-30")).toEqual({ min: "2026-11-30", max: "2027-01-29" });
    expect(isPromiseDateAllowed("2027-01-29", "2026-11-30")).toBe(true);
    expect(isPromiseDateAllowed("2027-01-30", "2026-11-30")).toBe(false);
    expect(promiseRange(todayInKolkata(new Date("2026-11-30T18:31:00Z"))).min).toBe("2026-12-01");
  });
});

describe("PUT and DELETE /api/invoices/{id}/promise", () => {
  it("saves the date and the note, and records the activity", async () => {
    const response = await send("PUT", {
      promisedOn: "2026-11-10",
      note: "  Finance pays on the 10th ",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      promisedOn: "2026-11-10",
      note: "Finance pays on the 10th",
    });
    expect(await store.listPromises()).toHaveLength(1);
    const [event] = await store.latestActivity(5);
    expect(event).toMatchObject({ kind: "promised", detail: "2026-11-10" });
    expect(describeEvent(event)).toBe("Tandem Health promised to pay invoice INV-0101 by 10 Nov");
    expect(paypal.refreshSnapshotNow).toHaveBeenCalledWith([id]);
  });

  it("replaces an earlier promise", async () => {
    await send("PUT", { promisedOn: "2026-11-10" });
    await send("PUT", { promisedOn: "2026-11-12", note: "Moved" });
    expect(await store.listPromises()).toMatchObject([{ promisedOn: "2026-11-12", note: "Moved" }]);
  });

  it.each([
    ["a date in the past", { promisedOn: "2026-11-04" }],
    ["a date more than 60 days ahead", { promisedOn: "2027-01-05" }],
  ])("refuses %s", async (_name, body) => {
    const response = await send("PUT", body);
    expect(response.status).toBe(400);
    const { error } = await response.json();
    expect(error).toMatchObject({
      code: "invalid_request",
      message: "Pick a date from today to 60 days ahead.",
    });
    expect(await store.listPromises()).toEqual([]);
  });

  it.each([
    ["no date", {}],
    ["a date that is not a date", { promisedOn: "10 Nov" }],
    ["a note over 200 characters", { promisedOn: "2026-11-10", note: "n".repeat(201) }],
  ])("refuses %s", async (_name, body) => {
    expect((await send("PUT", body)).status).toBe(400);
  });

  it("is for a late, unpaid invoice only", async () => {
    paypal.getInvoice.mockResolvedValue({ ...unpaid, status: "PAID" });
    expect((await send("PUT", { promisedOn: "2026-11-10" })).status).toBe(409);
    stubEnv({ DEMO_TODAY: "2026-10-28" });
    paypal.getInvoice.mockResolvedValue(unpaid);
    expect((await send("PUT", { promisedOn: "2026-11-10" })).status).toBe(409);
  });

  it("is not found for an unknown invoice", async () => {
    paypal.getInvoice.mockRejectedValue(
      new PayPalApiError({ status: 404, paypalName: "NOT_FOUND", message: "No such invoice." }),
    );
    expect((await send("PUT", { promisedOn: "2026-11-10" })).status).toBe(404);
    expect((await send("DELETE")).status).toBe(404);
  });

  it("removes the promise", async () => {
    await send("PUT", { promisedOn: "2026-11-10" });
    const response = await send("DELETE");
    expect(response.status).toBe(204);
    expect(await store.listPromises()).toEqual([]);
    expect(paypal.refreshSnapshotNow).toHaveBeenCalledTimes(2);
  });
});

describe("a promise ends with the invoice", () => {
  it("is cleared when a payment is recorded", async () => {
    await store.savePromise(stored(id));
    const response = await record(
      new Request(`http://localhost:3000/api/invoices/${id}/record-payment`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId, method: "WIRE_TRANSFER", paidOn: "2026-11-03" }),
      }),
      context() as never,
    );
    expect(response.status).toBe(200);
    expect(await store.listPromises()).toEqual([]);
  });

  it("is cleared when the invoice is cancelled", async () => {
    await store.savePromise(stored(id));
    const response = await cancel(
      new Request(`http://localhost:3000/api/invoices/${id}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId }),
      }),
      context() as never,
    );
    expect(response.status).toBe(200);
    expect(await store.listPromises()).toEqual([]);
  });

  it("is swept away by the morning run when the invoice is paid or gone, and kept while open", async () => {
    const open = overdueInvoice("2026-11-01", 4);
    const paid = paidInvoice("2026-11-01", "2026-11-04");
    await store.savePromise(stored(open.id));
    await store.savePromise(stored(paid.id));
    await store.savePromise(stored("INV2-CANCELLED"));

    await clearSettledPromises([open, paid].map(loadedOf));

    expect((await store.listPromises()).map(({ invoiceId }) => invoiceId)).toEqual([open.id]);
  });

  it("is forgotten by a demo reset", async () => {
    await store.savePromise(stored(id));
    await store.clearPromises();
    expect(await store.listPromises()).toEqual([]);
  });

  it("does not reach a paid invoice when promises are put on the invoices", () => {
    const open = overdueInvoice("2026-11-01", 4);
    const paid = paidInvoice("2026-11-01", "2026-11-04");
    const withThem = withPromises([open, paid].map(loadedOf), [stored(open.id), stored(paid.id)]);
    expect(withThem[0].summary.promise).toMatchObject({ promisedOn: "2026-11-10" });
    expect(withThem[1].summary.promise).toBeUndefined();
  });
});

describe("reminder drafts and a promised date", () => {
  function load(...summaries: InvoiceSummary[]): void {
    paypal.loadInvoices.mockResolvedValue(summaries.map(loadedOf));
  }

  const promised = (promisedOn: string): InvoiceSummary => ({
    ...overdueInvoice("2026-11-01", 4, OKAFOR),
    promise: { promisedOn, note: "", createdAt: "2026-11-04T05:00:00.000Z" },
  });

  beforeEach(async () => {
    await store.saveProfile({ ...EMPTY_PROFILE, yourName: "Riya Sharma" });
  });

  it("drafts nothing new in the morning while the promised date has not passed, today included", async () => {
    load(promised("2026-11-10"));
    expect(await prepareReminderDrafts()).toEqual([]);
    load(promised(TODAY));
    expect(await prepareReminderDrafts()).toEqual([]);
  });

  it("moves from promised to missed at midnight in India, not in UTC", async () => {
    stubEnv();
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      load(promised("2026-11-04"));
      vi.setSystemTime(new Date("2026-11-04T18:29:00Z"));
      expect(await prepareReminderDrafts()).toEqual([]);

      vi.setSystemTime(new Date("2026-11-04T18:31:00Z"));
      const [draft] = await prepareReminderDrafts();
      expect(draft.tone).toBe("firm");
      expect(draft.reason).toContain("promised 4 Nov, still unpaid");
    } finally {
      vi.useRealTimers();
    }
  });

  it("drafts again the day after the promised date, firm, and says why", async () => {
    const invoice = promised("2026-11-04");
    load(invoice);

    const [draft] = await prepareReminderDrafts();

    expect(draft.invoiceId).toBe(invoice.id);
    expect(draft.tone).toBe("firm");
    expect(draft.reason).toBe("Suggested firm: 4 days late, and promised 4 Nov, still unpaid.");
  });

  it("still lists the card while promised, with the promise on it, so it can be shown or expanded", async () => {
    load(promised("2026-11-10"));
    const [draft] = await listReminderDrafts();
    expect(draft.promise).toMatchObject({ promisedOn: "2026-11-10" });
    expect(draft.tone).toBe("gentle");
  });
});

describe("what a promise adds elsewhere", () => {
  it("adds a missed promise to the reason of the late-payer radar, and leaves the level alone", () => {
    const missed = {
      ...overdueInvoice("2026-11-01", 4, OKAFOR),
      promise: { promisedOn: "2026-11-03", note: "", createdAt: "2026-11-01T05:00:00.000Z" },
    };
    const plain = overdueInvoice("2026-11-01", 4, OKAFOR);
    const withMiss = scoreClient([missed], TODAY);
    const without = scoreClient([plain], TODAY);

    expect(withMiss.reason).toBe(`${without.reason} Missed a promised date once.`);
    expect(withMiss.level).toBe(without.level);
    const kept = { ...missed, promise: { ...missed.promise, promisedOn: "2026-11-10" } };
    expect(scoreClient([kept], TODAY).reason).toBe(without.reason);
  });

  it("shows the promise in the invoice timeline", () => {
    const summary = {
      ...overdueInvoice("2026-11-01", 4, OKAFOR),
      promise: { promisedOn: "2026-11-10", note: "", createdAt: "2026-11-05T05:00:00.000Z" },
    };
    const events = buildTimeline({
      invoice: unpaid,
      summary,
      reminders: [],
      activity: [],
      today: TODAY,
    });
    expect(events.find(({ kind }) => kind === "promised")).toMatchObject({
      at: "2026-11-05T05:00:00.000Z",
      promisedOn: "2026-11-10",
    });
  });
});

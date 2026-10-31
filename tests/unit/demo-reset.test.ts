import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/demo/reset/route";
import { demoMemo } from "@/lib/demo/story";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { createFakePayPal, type FakePayPal } from "../support/fake-paypal";
import { stubEnv } from "../support/env";

const paypal = vi.hoisted(() => ({
  nextInvoiceNumber: vi.fn(),
  createDraftInvoice: vi.fn(),
  sendInvoice: vi.fn(),
  recordExternalPayment: vi.fn(),
  cancelInvoice: vi.fn(),
  deleteDraftInvoice: vi.fn(),
  listInvoicesInFull: vi.fn(),
  clearInvoiceCaches: vi.fn(),
}));

vi.mock("@/lib/paypal/invoices", () => ({
  nextInvoiceNumber: paypal.nextInvoiceNumber,
  createDraftInvoice: paypal.createDraftInvoice,
  sendInvoice: paypal.sendInvoice,
  recordExternalPayment: paypal.recordExternalPayment,
  cancelInvoice: paypal.cancelInvoice,
  deleteDraftInvoice: paypal.deleteDraftInvoice,
}));
vi.mock("@/lib/paypal/summaries", () => ({
  listInvoicesInFull: paypal.listInvoicesInFull,
  clearInvoiceCaches: paypal.clearInvoiceCaches,
}));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

// connection() only works inside a Next.js request, which a direct call to the handler is not.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));

const STORY_SIZE = 8;
const HISTORY_SIZE = 4;

let fake: FakePayPal;

function reset(): Promise<Response> {
  return POST();
}

beforeEach(() => {
  store = createMemoryStore();
  stubEnv({ DEMO_TODAY: "2026-10-31", SANDBOX_BUYER_EMAIL: "buyer@personal.example.com" });
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  fake = createFakePayPal();
  paypal.nextInvoiceNumber.mockImplementation(fake.nextInvoiceNumber);
  paypal.createDraftInvoice.mockImplementation(fake.createDraftInvoice);
  paypal.sendInvoice.mockImplementation(fake.sendInvoice);
  paypal.recordExternalPayment.mockImplementation(fake.recordExternalPayment);
  paypal.cancelInvoice.mockImplementation(fake.cancelInvoice);
  paypal.deleteDraftInvoice.mockImplementation(fake.deleteDraftInvoice);
  paypal.listInvoicesInFull.mockImplementation(fake.listInvoicesInFull);
  paypal.clearInvoiceCaches.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("POST /api/demo/reset", () => {
  it("cancels open invoices outside the story, deletes drafts and leaves paid ones alone", async () => {
    const sent = fake.add("SENT", "dueline-request:one");
    const unpaid = fake.add("UNPAID");
    const draft = fake.add("DRAFT", "dueline-request:two");
    const paid = fake.add("PAID");
    const outside = fake.add("MARKED_AS_PAID");
    const partly = fake.add("PARTIALLY_PAID");
    const storyOpen = fake.add("SENT", demoMemo("tandem-pitch-deck"));

    const response = await reset();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      cancelled: 2,
      deleted: 1,
      created: STORY_SIZE - 1,
      skipped: 1,
      failed: 0,
    });
    expect(fake.calls.cancelled).toEqual([sent.id, unpaid.id]);
    expect(fake.calls.deleted).toEqual([draft.id]);
    expect(fake.statusOf(paid.id)).toBe("PAID");
    expect(fake.statusOf(outside.id)).toBe("MARKED_AS_PAID");
    expect(fake.statusOf(partly.id)).toBe("PARTIALLY_PAID");
    expect(fake.statusOf(storyOpen.id)).toBe("SENT");
    expect(paypal.clearInvoiceCaches).toHaveBeenCalledTimes(1);
  });

  it("sends no emails when it cancels", async () => {
    fake.add("SENT");
    await reset();
    expect(fake.calls.sent).toHaveLength(STORY_SIZE);
    expect(paypal.cancelInvoice).toHaveBeenCalledTimes(1);
    expect(paypal.cancelInvoice).toHaveBeenCalledWith(expect.any(String));
  });

  it("restores the story's history as payments recorded outside PayPal", async () => {
    await reset();
    expect(fake.calls.payments).toHaveLength(HISTORY_SIZE);
  });

  it("creates nothing the second time", async () => {
    await reset();
    store = createMemoryStore();
    const before = fake.invoices.size;

    const response = await reset();

    expect(await response.json()).toEqual({
      cancelled: 0,
      deleted: 0,
      created: 0,
      skipped: STORY_SIZE,
      failed: 0,
    });
    expect(fake.invoices.size).toBe(before);
  });

  it("allows one reset every ten minutes and says how long is left", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-31T10:00:00Z"));
    expect((await reset()).status).toBe(200);
    const calls = paypal.listInvoicesInFull.mock.calls.length;

    vi.setSystemTime(new Date("2026-10-31T10:04:00Z"));
    const refused = await reset();

    expect(refused.status).toBe(429);
    expect((await refused.json()).error).toEqual({
      code: "rate_limited",
      message: "The demo was reset a few minutes ago. Try again in 6 minutes.",
    });
    expect(paypal.listInvoicesInFull).toHaveBeenCalledTimes(calls);

    vi.setSystemTime(new Date("2026-10-31T10:10:01Z"));
    expect((await reset()).status).toBe(200);
  });

  it("is not found when demo mode is off, and asks PayPal for nothing", async () => {
    stubEnv({ DEMO_MODE: "false" });

    const response = await reset();

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("not_found");
    expect(paypal.listInvoicesInFull).not.toHaveBeenCalled();
  });

  it("reports a sample invoice it could not create", async () => {
    paypal.createDraftInvoice.mockRejectedValueOnce(new Error("PayPal is down."));

    const response = await reset();

    expect(await response.json()).toMatchObject({ created: STORY_SIZE - 1, failed: 1 });
  });
});

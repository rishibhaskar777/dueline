import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/demo/reset/route";
import { reseedStaleDemo } from "@/lib/demo/reset";
import { demoMemo } from "@/lib/demo/story";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { createFakePayPal, type FakePayPal } from "@/lib/paypal/offline/fake-paypal";
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

const STORY_SIZE = 9;
const HISTORY_SIZE = 5;
const OPEN_STORY_SIZE = STORY_SIZE - HISTORY_SIZE;

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
  it("cancels open invoices, including the story's older ones, deletes drafts and leaves paid ones alone", async () => {
    const sent = fake.add("SENT", "dueline-request:one");
    const unpaid = fake.add("UNPAID");
    const draft = fake.add("DRAFT", "dueline-request:two");
    const paid = fake.add("PAID");
    const outside = fake.add("MARKED_AS_PAID");
    const partly = fake.add("PARTIALLY_PAID");
    const storyOpen = fake.add("SENT", demoMemo(1, "tandem-pitch-deck"));

    const response = await reset();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      cancelled: 3,
      deleted: 1,
      created: STORY_SIZE,
      skipped: 0,
      failed: 0,
      kept: 0,
    });
    expect(fake.calls.cancelled).toEqual([storyOpen.id, sent.id, unpaid.id]);
    expect(fake.calls.deleted).toEqual([draft.id]);
    expect(fake.statusOf(paid.id)).toBe("PAID");
    expect(fake.statusOf(outside.id)).toBe("MARKED_AS_PAID");
    expect(fake.statusOf(partly.id)).toBe("PARTIALLY_PAID");
    expect(fake.statusOf(storyOpen.id)).toBe("CANCELLED");
    expect(paypal.clearInvoiceCaches).toHaveBeenCalledTimes(1);
  });

  it("clears the queued reminders of the old story, and keeps the retainers", async () => {
    const item = (id: string, kind: "reminder" | "repeat") => ({
      id,
      kind,
      title: id,
      detail: "",
      invoiceId: kind === "reminder" ? "INV2-OLD" : null,
      repeatId: kind === "repeat" ? "r1" : null,
    });
    await store.addQueueItem(item("reminder.INV2-OLD", "reminder"));
    await store.addQueueItem(item("repeat.r1.2026-11-05", "repeat"));

    await reset();

    expect((await store.listQueue()).map(({ id }) => id)).toEqual(["repeat.r1.2026-11-05"]);
  });

  it("keeps an invoice, sent or draft, that was created in the last 30 minutes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-31T10:00:00Z"));
    const createdAt = (minutesAgo: number): string =>
      new Date(Date.now() - minutesAgo * 60_000).toISOString();
    const fresh = fake.add("SENT", "dueline-request:fresh");
    fresh.detail.metadata = { create_time: createdAt(10) };
    const freshDraft = fake.add("DRAFT", "dueline-request:fresh-draft");
    freshDraft.detail.metadata = { create_time: createdAt(2) };
    const old = fake.add("SENT", "dueline-request:old");
    old.detail.metadata = { create_time: createdAt(31) };

    const body = await (await reset()).json();

    expect(body).toMatchObject({ cancelled: 1, deleted: 0, kept: 2 });
    expect(fake.calls.cancelled).toEqual([old.id]);
    expect(fake.calls.deleted).toEqual([]);
    expect(fake.statusOf(fresh.id)).toBe("SENT");
    expect(fake.statusOf(freshDraft.id)).toBe("DRAFT");
  });

  it("keeps an invoice whose creation time PayPal did not report", async () => {
    const unknown = fake.add("SENT", "dueline-request:unknown");
    delete unknown.detail.metadata;

    const body = await (await reset()).json();

    expect(body).toMatchObject({ cancelled: 0, kept: 1 });
    expect(fake.statusOf(unknown.id)).toBe("SENT");
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

  it("starts a new generation each time: the open story invoices are cancelled and the whole story is made again", async () => {
    await reset();
    expect(await store.getDemoGeneration()).toEqual({ id: 1, seededOn: "2026-10-31" });
    await store.hitRateLimit("demo-reset", 0);
    store = Object.assign(createMemoryStore(), {
      getDemoGeneration: store.getDemoGeneration,
      saveDemoGeneration: store.saveDemoGeneration,
    });

    const response = await reset();

    expect(await response.json()).toEqual({
      cancelled: OPEN_STORY_SIZE,
      deleted: 0,
      created: STORY_SIZE,
      skipped: 0,
      failed: 0,
      kept: 0,
    });
    expect(await store.getDemoGeneration()).toEqual({ id: 2, seededOn: "2026-10-31" });
    const paidStory = [...fake.invoices.values()].filter(
      (invoice) => invoice.status === "MARKED_AS_PAID",
    );
    expect(paidStory).toHaveLength(HISTORY_SIZE * 2);
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

describe("reseedStaleDemo", () => {
  async function ageGenerationTo(seededOn: string): Promise<void> {
    await store.saveDemoGeneration({ id: 4, seededOn });
  }

  it("does nothing while the generation is 6 days old", async () => {
    await ageGenerationTo("2026-10-25");

    await reseedStaleDemo();

    expect(await store.getDemoGeneration()).toEqual({ id: 4, seededOn: "2026-10-25" });
    expect(paypal.listInvoicesInFull).not.toHaveBeenCalled();
  });

  it("does nothing when no generation has been seeded yet", async () => {
    await reseedStaleDemo();
    expect(paypal.listInvoicesInFull).not.toHaveBeenCalled();
  });

  it("starts a new generation at 7 days, cancels only the open story invoices of older ones", async () => {
    await ageGenerationTo("2026-10-24");
    const oldOpen = fake.add("SENT", demoMemo(4, "tandem-pitch-deck"));
    const oldPaid = fake.add("MARKED_AS_PAID", demoMemo(4, "okafor-logo-refresh"));
    const other = fake.add("SENT", "dueline-request:mine");
    const draft = fake.add("DRAFT", "dueline-request:draft");

    await reseedStaleDemo();

    expect(await store.getDemoGeneration()).toEqual({ id: 5, seededOn: "2026-10-31" });
    expect(fake.calls.cancelled).toEqual([oldOpen.id]);
    expect(fake.calls.deleted).toEqual([]);
    expect(fake.statusOf(oldPaid.id)).toBe("MARKED_AS_PAID");
    expect(fake.statusOf(other.id)).toBe("SENT");
    expect(fake.statusOf(draft.id)).toBe("DRAFT");
    expect(
      [...fake.invoices.values()].filter((i) => i.detail.memo?.includes("dueline-demo:5:")),
    ).toHaveLength(STORY_SIZE);
  });

  it("clears the queued reminders when it starts a new generation", async () => {
    await ageGenerationTo("2026-10-24");
    await store.addQueueItem({
      id: "reminder.INV2-OLD",
      kind: "reminder",
      title: "Remind Brightwell Labs about 0014",
      detail: "",
      invoiceId: "INV2-OLD",
      repeatId: null,
    });

    await reseedStaleDemo();

    expect(await store.listQueue()).toEqual([]);
  });

  it("is skipped and logged when the reset limit was hit", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await ageGenerationTo("2026-10-24");
    await store.hitRateLimit("demo-reset", 600);
    await store.putCached("demo-reset", Date.now(), 600);

    await reseedStaleDemo();

    expect(await store.getDemoGeneration()).toEqual({ id: 4, seededOn: "2026-10-24" });
    expect(paypal.listInvoicesInFull).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith("Demo re-seed skipped", {
      reason: "reset_limit",
      generation: 4,
    });
  });

  it("does nothing outside demo mode", async () => {
    stubEnv({ DEMO_MODE: "false" });
    await ageGenerationTo("2026-10-01");

    await reseedStaleDemo();

    expect(paypal.listInvoicesInFull).not.toHaveBeenCalled();
  });
});

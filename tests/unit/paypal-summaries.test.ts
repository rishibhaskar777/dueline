import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearInvoiceCaches,
  findInvoiceByMemo,
  invoicesLoadedAt,
  loadInvoices,
  refreshSnapshotNow,
  warmInvoiceSnapshot,
} from "@/lib/paypal/summaries";
import { readStoredInvoice } from "@/lib/paypal/invoice-cache";
import { getStore } from "@/lib/store";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { PayPalInvoice } from "@/lib/paypal/types";
import type { ActualPayout } from "@/types";
import { stubEnv } from "../support/env";
import paidFixture from "../fixtures/paypal/invoice-paid.json";
import unpaidFixture from "../fixtures/paypal/invoice-unpaid.json";

const paypal = vi.hoisted(() => ({
  listInvoices: vi.fn(),
  getInvoice: vi.fn(),
  getActualPayout: vi.fn(),
}));

vi.mock("@/lib/paypal/invoices", () => ({
  listInvoices: paypal.listInvoices,
  getInvoice: paypal.getInvoice,
}));
vi.mock("@/lib/paypal/payments", () => ({ getActualPayout: paypal.getActualPayout }));

const unpaid = unpaidFixture as PayPalInvoice;
const paid = paidFixture as PayPalInvoice;

const payout: ActualPayout = {
  fee: { currency: "USD", value: "20.10" },
  net: { currency: "USD", value: "429.90" },
  exchangeRate: 82.85,
  netInr: 35617,
  source: "paypal_capture",
  paidAt: "2026-10-15T11:42:00Z",
  transactionId: "5GX12345AB6789012",
};

// A payout stored before paid times were recorded has no paidAt key.
function legacyPayout(): ActualPayout {
  const legacy: Partial<ActualPayout> = { ...payout };
  delete legacy.paidAt;
  return legacy as ActualPayout;
}

function withId(invoice: PayPalInvoice, id: string): PayPalInvoice {
  return { ...invoice, id };
}

// The list leaves out items and the payer link; the full read has them.
function listed(invoice: PayPalInvoice): PayPalInvoice {
  return {
    ...invoice,
    items: undefined,
    detail: { ...invoice.detail, metadata: undefined },
  };
}

function serve(...invoices: PayPalInvoice[]): void {
  paypal.listInvoices.mockResolvedValue(invoices.map(listed));
  paypal.getInvoice.mockImplementation(async (id: string) =>
    invoices.find((invoice) => invoice.id === id),
  );
}

async function summaries() {
  return (await loadInvoices()).map(({ summary }) => summary);
}

describe("loadInvoices", () => {
  beforeEach(async () => {
    stubEnv({ DEMO_TODAY: "2026-10-17" });
    vi.resetAllMocks();
    await clearInvoiceCaches();
  });

  it("drops drafts and cancelled invoices and sorts newest first", async () => {
    serve(
      withId({ ...paid, status: "UNPAID" }, "older"),
      { ...withId(unpaid, "draft"), status: "DRAFT" },
      withId(unpaid, "newer"),
      { ...withId(unpaid, "cancelled"), status: "CANCELLED" },
    );
    expect((await summaries()).map((summary) => summary.id)).toEqual(["newer", "older"]);
  });

  it("takes the work and pay link from the full invoice", async () => {
    serve(withId(unpaid, "open"));
    const [summary] = await summaries();
    expect(summary.work).toBe("Pitch deck design");
    expect(summary.payLink).toBe("https://www.sandbox.paypal.com/invoice/p/#TEST0001");
  });

  it("carries the invoice's latest payment ID, or none for an unpaid invoice", async () => {
    serve(withId(paid, "paid"), withId(unpaid, "open"));
    paypal.getActualPayout.mockResolvedValue(null);
    const byId = new Map((await loadInvoices()).map((loaded) => [loaded.summary.id, loaded]));
    expect(byId.get("paid")?.paymentId).toBe("5GX12345AB6789012");
    expect(byId.get("open")?.paymentId).toBeNull();
  });

  it("works out what is still due on a partly paid invoice", async () => {
    serve({
      ...withId(unpaid, "partial"),
      status: "PARTIALLY_PAID",
      payments: { paid_amount: { currency_code: "USD", value: "400.00" } },
    });
    paypal.getActualPayout.mockResolvedValue(null);
    const [loaded] = await loadInvoices();
    expect(loaded.summary.amount.value).toBe("900.00");
    expect(loaded.amountDue).toEqual({ currency: "USD", value: "500.00" });
  });

  it("reads at most 4 full invoices at a time", async () => {
    let running = 0;
    let busiest = 0;
    const invoices = Array.from({ length: 10 }, (_, index) => withId(unpaid, `inv-${index}`));
    paypal.listInvoices.mockResolvedValue(invoices.map(listed));
    paypal.getInvoice.mockImplementation(async (id: string) => {
      running += 1;
      busiest = Math.max(busiest, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      return invoices.find((invoice) => invoice.id === id);
    });

    expect(await loadInvoices()).toHaveLength(10);
    expect(paypal.getInvoice).toHaveBeenCalledTimes(10);
    expect(busiest).toBe(4);
  });

  it("shares one load between callers that arrive together", async () => {
    serve(withId(unpaid, "open"));
    await Promise.all([loadInvoices(), loadInvoices(), loadInvoices()]);
    expect(paypal.listInvoices).toHaveBeenCalledTimes(1);
  });

  it("reads a full invoice again once the stored copy is older than 6 hours", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      serve(withId(unpaid, "open"));
      await loadInvoices();
      vi.setSystemTime(Date.now() + 7 * 60 * 60_000);
      await refreshSnapshotNow();
      expect(paypal.getInvoice).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("starts again after the caches are cleared", async () => {
    serve(withId(unpaid, "open"));
    await loadInvoices();
    await clearInvoiceCaches();
    await loadInvoices();
    expect(paypal.listInvoices).toHaveBeenCalledTimes(2);
    expect(paypal.getInvoice).toHaveBeenCalledTimes(2);
  });

  it("looks up a paid invoice's payout once and then reads it from the store", async () => {
    serve(withId(paid, "stored-payout"));
    paypal.getActualPayout.mockResolvedValue(payout);

    const first = await summaries();
    await clearInvoiceCaches();
    serve(withId(paid, "stored-payout"));
    const second = await summaries();
    expect(first[0].actualPayout).toEqual(payout);
    expect(second[0].actualPayout).toEqual(payout);
    expect(paypal.getActualPayout).toHaveBeenCalledTimes(1);
  });

  it("reads a stored payout without a paid time from PayPal once more", async () => {
    serve(withId(paid, "legacy-payout"));
    await getStore().putActualPayout("legacy-payout", legacyPayout());
    paypal.getActualPayout.mockResolvedValue(payout);

    expect((await summaries())[0].actualPayout).toEqual(payout);
    await clearInvoiceCaches();
    serve(withId(paid, "legacy-payout"));
    expect((await summaries())[0].actualPayout).toEqual(payout);
    expect(paypal.getActualPayout).toHaveBeenCalledTimes(1);
  });

  it("keeps a stored payout without a paid time when PayPal cannot be read again", async () => {
    serve(withId(paid, "legacy-offline"));
    await getStore().putActualPayout("legacy-offline", legacyPayout());
    paypal.getActualPayout.mockResolvedValue(null);

    expect((await summaries())[0].actualPayout).toEqual(legacyPayout());
  });

  it("does not ask PayPal again straight away when no payout is available", async () => {
    serve(withId(paid, "no-payout"));
    paypal.getActualPayout.mockResolvedValue(null);

    const first = await summaries();
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(Date.now() + 60_000);
      await loadInvoices();
    } finally {
      vi.useRealTimers();
    }
    expect(first[0].actualPayout).toBeNull();
    expect(paypal.getActualPayout).toHaveBeenCalledTimes(1);
  });

  it("leaves unpaid invoices without a payout lookup", async () => {
    serve(withId(unpaid, "open"));
    await loadInvoices();
    expect(paypal.getActualPayout).not.toHaveBeenCalled();
  });
});

describe("findInvoiceByMemo", () => {
  function withMemo(invoice: PayPalInvoice, id: string, memo: string): PayPalInvoice {
    return { ...withId(invoice, id), detail: { ...invoice.detail, memo } };
  }

  beforeEach(async () => {
    stubEnv({ DEMO_TODAY: "2026-10-17" });
    vi.resetAllMocks();
    await clearInvoiceCaches();
  });

  it("finds an invoice by the memo only a full read shows, drafts included", async () => {
    serve(withMemo(unpaid, "other", "dueline-request:aaa"), {
      ...withMemo(unpaid, "wanted", "dueline-request:bbb"),
      status: "DRAFT",
    });
    expect((await findInvoiceByMemo("dueline-request:bbb"))?.id).toBe("wanted");
  });

  it("finds nothing when no invoice carries the memo", async () => {
    serve(withMemo(unpaid, "other", "dueline-request:aaa"));
    expect(await findInvoiceByMemo("dueline-request:bbb")).toBeUndefined();
  });

  it("is not answered from the finished list", async () => {
    serve(withMemo(unpaid, "first", "dueline-request:aaa"));
    await loadInvoices();
    serve(
      withMemo(unpaid, "first", "dueline-request:aaa"),
      withMemo(unpaid, "second", "dueline-request:bbb"),
    );
    expect((await findInvoiceByMemo("dueline-request:bbb"))?.id).toBe("second");
  });
});

describe("the invoice snapshot", () => {
  const SECOND = 1000;

  beforeEach(async () => {
    stubEnv({ DEMO_TODAY: "2026-10-17" });
    vi.resetAllMocks();
    await clearInvoiceCaches();
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function later(seconds: number): void {
    vi.setSystemTime(Date.now() + seconds * SECOND);
  }

  async function statuses(): Promise<string[]> {
    return (await summaries()).map((summary) => summary.paypalStatus);
  }

  it("answers from the snapshot while it is fresh", async () => {
    serve(withId(unpaid, "open"));
    await loadInvoices();
    later(59);
    await loadInvoices();
    expect(paypal.listInvoices).toHaveBeenCalledTimes(1);
    expect(paypal.getInvoice).toHaveBeenCalledTimes(1);
  });

  it("answers from an old snapshot at once and refreshes it in the background", async () => {
    serve(withId(unpaid, "open"));
    await loadInvoices();
    serve(withId(unpaid, "open"), withId(unpaid, "new"));
    later(61);

    expect(await summaries()).toHaveLength(1);
    await vi.waitFor(async () => expect(await summaries()).toHaveLength(2));
    expect(paypal.listInvoices).toHaveBeenCalledTimes(2);
  });

  it("reads again only the invoices that are new or changed", async () => {
    serve(withId(unpaid, "steady"), withId(unpaid, "moves"));
    await loadInvoices();
    expect(paypal.getInvoice).toHaveBeenCalledTimes(2);

    paypal.getActualPayout.mockResolvedValue(null);
    serve(
      withId(unpaid, "steady"),
      { ...withId(unpaid, "moves"), status: "PARTIALLY_PAID" },
      withId(unpaid, "added"),
    );
    later(61);
    await loadInvoices();
    await vi.waitFor(() => expect(paypal.listInvoices).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(paypal.getInvoice).toHaveBeenCalledTimes(4));
    expect(
      paypal.getInvoice.mock.calls
        .slice(2)
        .map(([id]) => id)
        .sort(),
    ).toEqual(["added", "moves"]);
  });

  it("makes the next read exact after a write", async () => {
    serve(withId(unpaid, "open"));
    expect(await statuses()).toEqual(["SENT"]);

    paypal.getActualPayout.mockResolvedValue(null);
    serve({ ...withId(unpaid, "open"), status: "PAID" });
    await refreshSnapshotNow(["open"]);

    expect(await statuses()).toEqual(["PAID"]);
    expect(paypal.listInvoices).toHaveBeenCalledTimes(2);
  });

  it("reads a named invoice again even when the list shows no change", async () => {
    serve(withId(unpaid, "open"));
    await loadInvoices();
    await refreshSnapshotNow(["open"]);
    expect(paypal.getInvoice).toHaveBeenCalledTimes(2);
  });

  it("keeps the old snapshot when a background refresh fails, and tries again later", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    serve(withId(unpaid, "open"));
    await loadInvoices();

    paypal.listInvoices.mockRejectedValue(new Error("PayPal is down"));
    later(61);
    expect(await summaries()).toHaveLength(1);
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining("keeping")));
    expect(await summaries()).toHaveLength(1);
    expect(paypal.listInvoices).toHaveBeenCalledTimes(2);

    serve(withId(unpaid, "open"), withId(unpaid, "new"));
    later(31);
    expect(await summaries()).toHaveLength(1);
    await vi.waitFor(async () => expect(await summaries()).toHaveLength(2));
  });

  it("drops the snapshot when the refresh after a write fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    serve(withId(unpaid, "open"));
    await loadInvoices();

    paypal.listInvoices.mockRejectedValueOnce(new Error("PayPal is down"));
    await refreshSnapshotNow(["open"]);

    paypal.getActualPayout.mockResolvedValue(null);
    serve({ ...withId(unpaid, "open"), status: "PAID" });
    expect(await statuses()).toEqual(["PAID"]);
  });

  it("starts one refresh for requests that arrive together", async () => {
    serve(withId(unpaid, "open"));
    await loadInvoices();
    later(61);

    await Promise.all([loadInvoices(), loadInvoices(), loadInvoices()]);
    await vi.waitFor(() => expect(paypal.listInvoices).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(paypal.listInvoices).toHaveBeenCalledTimes(2);
  });

  describe("across the India day boundary", () => {
    function dueOn(id: string, due: string): PayPalInvoice {
      return {
        ...withId(unpaid, id),
        detail: { ...unpaid.detail, payment_term: { due_date: due } },
      };
    }

    async function states() {
      return Object.fromEntries(
        (await summaries()).map(({ id, dueState, daysLate }) => [id, { dueState, daysLate }]),
      );
    }

    beforeEach(async () => {
      stubEnv({ DEMO_TODAY: "2026-12-01" });
      serve(dueOn("tomorrow", "2026-12-02"), dueOn("today", "2026-12-01"));
      expect(await states()).toEqual({
        tomorrow: { dueState: "due_soon", daysLate: 0 },
        today: { dueState: "due_soon", daysLate: 0 },
      });
      paypal.listInvoices.mockRejectedValue(new Error("PayPal is down"));
      paypal.getInvoice.mockRejectedValue(new Error("PayPal is down"));
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
    });

    it("works out due and late states for the new day from yesterday's snapshot", async () => {
      stubEnv({ DEMO_TODAY: "2026-12-02" });
      later(5);
      expect(await states()).toEqual({
        tomorrow: { dueState: "due_soon", daysLate: 0 },
        today: { dueState: "overdue", daysLate: 1 },
      });
      expect(paypal.listInvoices).toHaveBeenCalledTimes(1);
      expect(paypal.getInvoice).toHaveBeenCalledTimes(2);
    });

    it("serves a day-old snapshot at once and keeps it when the refresh fails", async () => {
      stubEnv({ DEMO_TODAY: "2026-12-02" });
      later(24 * 60 * 60);
      expect(await states()).toEqual({
        tomorrow: { dueState: "due_soon", daysLate: 0 },
        today: { dueState: "overdue", daysLate: 1 },
      });
      await vi.waitFor(() => expect(paypal.listInvoices).toHaveBeenCalledTimes(2));
    });

    it("builds the summaries of the demo's invoices in milliseconds", async () => {
      const many = Array.from({ length: 40 }, (_, index) => dueOn(`inv-${index}`, "2026-12-05"));
      paypal.listInvoices.mockResolvedValue(many.map(listed));
      paypal.getInvoice.mockImplementation(async (id: string) =>
        many.find((invoice) => invoice.id === id),
      );
      await refreshSnapshotNow();
      const started = performance.now();
      for (let read = 0; read < 20; read += 1) await loadInvoices();
      expect((performance.now() - started) / 20).toBeLessThan(25);
    });
  });

  it("stops keeping an invoice that PayPal no longer lists", async () => {
    const gone = withId(unpaid, "gone");
    serve(withId(unpaid, "stays"), gone);
    await loadInvoices();
    serve(withId(unpaid, "stays"));
    await refreshSnapshotNow();

    expect(await readStoredInvoice("gone")).toBeNull();
    expect(await readStoredInvoice("stays")).not.toBeNull();
    expect(await summaries()).toHaveLength(1);
  });

  it("treats a stored snapshot of the wrong shape as missing", async () => {
    await getStore().putCached("invoices:snapshot:v2", { builtAt: 1, invoices: [] }, 60);
    serve(withId(unpaid, "open"));
    expect(await summaries()).toHaveLength(1);
    expect(paypal.listInvoices).toHaveBeenCalledTimes(1);
  });

  it("gives a new instance the stored snapshot without asking PayPal", async () => {
    const shared = createMemoryStore();
    vi.doMock("@/lib/store", () => ({ getStore: () => shared }));
    try {
      vi.resetModules();
      serve(withId(unpaid, "open"));
      await (await import("@/lib/paypal/summaries")).loadInvoices();
      expect(paypal.listInvoices).toHaveBeenCalledTimes(1);

      vi.resetModules();
      const second = await import("@/lib/paypal/summaries");
      later(20);
      expect(await second.loadInvoices()).toHaveLength(1);
      expect(paypal.listInvoices).toHaveBeenCalledTimes(1);
      expect(second.invoicesLoadedAt()).toEqual(expect.any(String));
    } finally {
      vi.doUnmock("@/lib/store");
      vi.resetModules();
    }
  });

  it("warms a missing snapshot and leaves a fresh one alone", async () => {
    serve(withId(unpaid, "open"));
    expect(invoicesLoadedAt()).toBeNull();
    await warmInvoiceSnapshot();
    expect(invoicesLoadedAt()).not.toBeNull();
    await warmInvoiceSnapshot();
    expect(paypal.listInvoices).toHaveBeenCalledTimes(1);
  });
});

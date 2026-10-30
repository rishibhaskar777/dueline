import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearInvoiceCaches, findInvoiceByMemo, loadInvoices } from "@/lib/paypal/summaries";
import { getStore } from "@/lib/store";
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
  beforeEach(() => {
    stubEnv({ DEMO_TODAY: "2026-10-17" });
    vi.resetAllMocks();
    clearInvoiceCaches();
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

  it("does not call PayPal again within 20 seconds", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      serve(withId(unpaid, "open"));
      await loadInvoices();
      vi.setSystemTime(Date.now() + 19_000);
      await loadInvoices();
      expect(paypal.listInvoices).toHaveBeenCalledTimes(1);

      vi.setSystemTime(Date.now() + 2_000);
      await loadInvoices();
      expect(paypal.listInvoices).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shares one load between callers that arrive together", async () => {
    serve(withId(unpaid, "open"));
    await Promise.all([loadInvoices(), loadInvoices(), loadInvoices()]);
    expect(paypal.listInvoices).toHaveBeenCalledTimes(1);
  });

  it("reuses a full invoice while its status is unchanged and reads it again when it changes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      serve(withId(unpaid, "open"));
      await loadInvoices();
      vi.setSystemTime(Date.now() + 30_000);
      await loadInvoices();
      expect(paypal.getInvoice).toHaveBeenCalledTimes(1);

      serve({ ...withId(unpaid, "open"), status: "PARTIALLY_PAID" });
      paypal.getActualPayout.mockResolvedValue(null);
      vi.setSystemTime(Date.now() + 30_000);
      await loadInvoices();
      expect(paypal.getInvoice).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reads a full invoice again after 10 minutes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      serve(withId(unpaid, "open"));
      await loadInvoices();
      vi.setSystemTime(Date.now() + 11 * 60_000);
      await loadInvoices();
      expect(paypal.getInvoice).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("starts again after the caches are cleared", async () => {
    serve(withId(unpaid, "open"));
    await loadInvoices();
    clearInvoiceCaches();
    await loadInvoices();
    expect(paypal.listInvoices).toHaveBeenCalledTimes(2);
    expect(paypal.getInvoice).toHaveBeenCalledTimes(2);
  });

  it("looks up a paid invoice's payout once and then reads it from the store", async () => {
    serve(withId(paid, "stored-payout"));
    paypal.getActualPayout.mockResolvedValue(payout);

    const first = await summaries();
    clearInvoiceCaches();
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
    clearInvoiceCaches();
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

  beforeEach(() => {
    stubEnv({ DEMO_TODAY: "2026-10-17" });
    vi.resetAllMocks();
    clearInvoiceCaches();
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

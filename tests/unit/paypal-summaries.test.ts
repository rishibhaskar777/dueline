import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadInvoiceSummaries } from "@/lib/paypal/summaries";
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
};

function withId(invoice: PayPalInvoice, id: string): PayPalInvoice {
  return { ...invoice, id };
}

describe("loadInvoiceSummaries", () => {
  beforeEach(() => {
    stubEnv({ DEMO_TODAY: "2026-10-17" });
    vi.resetAllMocks();
  });

  it("drops drafts and cancelled invoices and sorts newest first", async () => {
    paypal.listInvoices.mockResolvedValue([
      withId({ ...paid, status: "UNPAID" }, "older"),
      { ...withId(unpaid, "draft"), status: "DRAFT" },
      withId(unpaid, "newer"),
      { ...withId(unpaid, "cancelled"), status: "CANCELLED" },
    ]);
    const summaries = await loadInvoiceSummaries();
    expect(summaries.map((summary) => summary.id)).toEqual(["newer", "older"]);
  });

  it("looks up a paid invoice's payout once and then reads it from the store", async () => {
    paypal.listInvoices.mockResolvedValue([withId(paid, "stored-payout")]);
    paypal.getActualPayout.mockResolvedValue(payout);

    const first = await loadInvoiceSummaries();
    const second = await loadInvoiceSummaries();
    expect(first[0].actualPayout).toEqual(payout);
    expect(second[0].actualPayout).toEqual(payout);
    expect(paypal.getActualPayout).toHaveBeenCalledTimes(1);
  });

  it("does not ask PayPal again straight away when no payout is available", async () => {
    paypal.listInvoices.mockResolvedValue([withId(paid, "no-payout")]);
    paypal.getActualPayout.mockResolvedValue(null);

    const summaries = await loadInvoiceSummaries();
    await loadInvoiceSummaries();
    expect(summaries[0].actualPayout).toBeNull();
    expect(paypal.getActualPayout).toHaveBeenCalledTimes(1);
  });

  it("reads a paid invoice again when the list left out its payments", async () => {
    const bare: PayPalInvoice = { ...withId(paid, "bare"), payments: undefined };
    paypal.listInvoices.mockResolvedValue([bare]);
    paypal.getInvoice.mockResolvedValue(withId(paid, "bare"));
    paypal.getActualPayout.mockResolvedValue(null);

    const summaries = await loadInvoiceSummaries();
    expect(paypal.getInvoice).toHaveBeenCalledWith("bare");
    expect(summaries[0].paidOn).toBe("2026-10-15");
  });

  it("leaves unpaid invoices without a payout lookup", async () => {
    paypal.listInvoices.mockResolvedValue([withId(unpaid, "open")]);
    await loadInvoiceSummaries();
    expect(paypal.getActualPayout).not.toHaveBeenCalled();
    expect(paypal.getInvoice).not.toHaveBeenCalled();
  });
});

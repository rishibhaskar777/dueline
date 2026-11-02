import { beforeEach, describe, expect, it, vi } from "vitest";
import { reconcilePaidInvoices } from "@/lib/paypal/reconcile-paid";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import type { InvoiceSummary } from "@/types";
import { paidInvoice } from "../support/summaries";

const holder = vi.hoisted(() => ({ invoices: [] as InvoiceSummary[] }));
vi.mock("@/lib/demo/visible-invoices", () => ({
  loadVisibleInvoices: async () => holder.invoices.map((summary) => ({ summary })),
}));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

const TODAY = "2026-12-05";

beforeEach(() => {
  store = createMemoryStore();
  holder.invoices = [];
});

describe("reconcilePaidInvoices", () => {
  it("adds the paid row of an invoice PayPal paid whose webhook never came", async () => {
    holder.invoices = [paidInvoice("2026-12-01", "2026-12-03")];
    holder.invoices[0].paypalStatus = "PAID";

    expect(await reconcilePaidInvoices(TODAY)).toBe(1);

    const [event] = await store.latestActivity(10);
    expect(event).toMatchObject({ kind: "paid", invoiceId: holder.invoices[0].id });
  });

  it("dates the row by the day PayPal paid it, not by the day it was noticed", async () => {
    holder.invoices = [{ ...paidInvoice("2026-12-01", "2026-12-03"), paypalStatus: "PAID" }];
    await reconcilePaidInvoices(TODAY);
    const [event] = await store.latestActivity(10);
    expect(event.at.startsWith("2026-12-03")).toBe(true);
  });

  it("adds nothing for an invoice whose webhook did arrive, or on a second run", async () => {
    const invoice = { ...paidInvoice("2026-12-01", "2026-12-03"), paypalStatus: "PAID" };
    holder.invoices = [invoice];
    await store.addActivity({
      id: "WH-1",
      kind: "paid",
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      clientName: invoice.client.name,
      at: "2026-12-03T05:00:00.000Z",
    });
    expect(await reconcilePaidInvoices(TODAY)).toBe(0);
    expect((await store.latestActivity(10)).filter((e) => e.kind === "paid")).toHaveLength(1);

    store = createMemoryStore();
    expect(await reconcilePaidInvoices(TODAY)).toBe(1);
    expect(await reconcilePaidInvoices(TODAY)).toBe(0);
  });

  it("leaves out payments recorded outside PayPal and old payments", async () => {
    holder.invoices = [
      { ...paidInvoice("2026-12-01", "2026-12-03"), paypalStatus: "MARKED_AS_PAID" },
      { ...paidInvoice("2026-10-01", "2026-10-03"), paypalStatus: "PAID" },
    ];
    expect(await reconcilePaidInvoices(TODAY)).toBe(0);
    expect(await store.latestActivity(10)).toEqual([]);
  });
});

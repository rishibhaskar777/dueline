import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  changeMarkOf,
  dropSnapshot,
  dropStoredInvoice,
  readSnapshot,
  readStoredInvoice,
  saveSnapshot,
  saveStoredInvoice,
} from "@/lib/paypal/invoice-cache";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import unpaidFixture from "../fixtures/paypal/invoice-unpaid.json";

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

const unpaid = unpaidFixture as PayPalInvoice;

beforeEach(() => {
  store = createMemoryStore();
});

describe("changeMarkOf", () => {
  it("stays the same for the same invoice", () => {
    expect(changeMarkOf(unpaid)).toBe(changeMarkOf({ ...unpaid }));
  });

  it("changes with the status, the amount paid and the due date", () => {
    const mark = changeMarkOf(unpaid);
    expect(changeMarkOf({ ...unpaid, status: "PAID" })).not.toBe(mark);
    expect(
      changeMarkOf({
        ...unpaid,
        payments: { paid_amount: { currency_code: "USD", value: "10.00" } },
      }),
    ).not.toBe(mark);
    expect(
      changeMarkOf({
        ...unpaid,
        detail: { ...unpaid.detail, payment_term: { due_date: "2030-01-01" } },
      }),
    ).not.toBe(mark);
  });
});

describe("the stored snapshot", () => {
  const snapshot = { builtAt: 1_000, entries: [] };

  it("is read back as saved", async () => {
    await saveSnapshot(snapshot);
    expect(await readSnapshot()).toEqual(snapshot);
  });

  it("is missing until saved, after it is dropped, and when its shape is wrong", async () => {
    expect(await readSnapshot()).toBeNull();
    await saveSnapshot(snapshot);
    await dropSnapshot();
    expect(await readSnapshot()).toBeNull();
    await store.putCached("invoices:snapshot:v2", { builtAt: "now" }, 60);
    expect(await readSnapshot()).toBeNull();
  });

  it("reads as missing when the store fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    store = { ...store, getCached: () => Promise.reject(new Error("down")) };
    expect(await readSnapshot()).toBeNull();
  });
});

describe("a stored full invoice", () => {
  it("is kept by invoice id and can be dropped", async () => {
    const stored = { invoice: unpaid, mark: changeMarkOf(unpaid), readAt: 5 };
    await saveStoredInvoice("a", stored);
    expect(await readStoredInvoice("a")).toEqual(stored);
    expect(await readStoredInvoice("b")).toBeNull();
    await dropStoredInvoice("a");
    expect(await readStoredInvoice("a")).toBeNull();
  });
});

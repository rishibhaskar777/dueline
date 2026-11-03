import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelInvoice } from "@/lib/invoices/cancel-invoice";
import { sendExistingDraft } from "@/lib/invoices/create-invoice";
import { recordPayment } from "@/lib/invoices/record-payment";
import { resetDemo } from "@/lib/demo/reset";
import { setInvoiceHiddenInDemo } from "@/lib/demo/hide-invoice";
import { loadVisibleInvoices } from "@/lib/demo/visible-invoices";
import { createFakePayPal, type FakePayPal } from "@/lib/paypal/offline/fake-paypal";
import { processWebhookEvent } from "@/lib/paypal/webhook-events";
import { clearInvoiceCaches, loadInvoices } from "@/lib/paypal/summaries";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { stubEnv } from "../support/env";

// The real snapshot and the real write paths, over a stand-in for PayPal that keeps invoices.
const paypal = vi.hoisted(() => ({ fake: undefined as unknown as FakePayPal }));

vi.mock("@/lib/paypal/invoices", () => ({
  nextInvoiceNumber: () => paypal.fake.nextInvoiceNumber(),
  createDraftInvoice: (...args: Parameters<FakePayPal["createDraftInvoice"]>) =>
    paypal.fake.createDraftInvoice(...args),
  sendInvoice: (id: string) => paypal.fake.sendInvoice(id),
  recordExternalPayment: (...args: Parameters<FakePayPal["recordExternalPayment"]>) =>
    paypal.fake.recordExternalPayment(...args),
  cancelInvoice: (id: string) => paypal.fake.cancelInvoice(id),
  deleteDraftInvoice: (id: string) => paypal.fake.deleteDraftInvoice(id),
  getInvoice: (id: string) => paypal.fake.getInvoice(id),
  listInvoices: () => paypal.fake.listInvoicesInFull(),
}));
vi.mock("@/lib/paypal/payments", () => ({ getActualPayout: async () => null }));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

const BUYER = "buyer@personal.example.com";
const REQUEST = "11111111-1111-4111-8111-111111111111";

async function statuses(): Promise<Record<string, string>> {
  const loaded = await loadInvoices();
  return Object.fromEntries(loaded.map(({ summary }) => [summary.id, summary.paypalStatus]));
}

function setStatus(id: string, status: "PAID" | "CANCELLED"): void {
  const invoice = paypal.fake.invoices.get(id);
  if (invoice) paypal.fake.invoices.set(id, { ...invoice, status });
}

function withRecipient(invoice: ReturnType<FakePayPal["add"]>): void {
  paypal.fake.invoices.set(invoice.id, {
    ...invoice,
    amount: { currency_code: "USD", value: "100.00" },
    primary_recipients: [{ billing_info: { email_address: BUYER } }],
  });
}

beforeEach(async () => {
  store = createMemoryStore();
  paypal.fake = createFakePayPal();
  stubEnv({ DEMO_TODAY: "2026-10-17", SANDBOX_BUYER_EMAIL: BUYER, DEMO_MODE: "true" });
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  await clearInvoiceCaches();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the snapshot after a write", () => {
  it("shows an invoice as cancelled on the read right after cancelling it, while fresh", async () => {
    const open = paypal.fake.add("SENT");
    withRecipient(open);
    expect(await statuses()).toEqual({ [open.id]: "SENT" });

    await cancelInvoice(open.id, { requestId: REQUEST, notifyClient: false });

    expect(await statuses()).toEqual({});
  });

  it("shows a recorded payment on the next read", async () => {
    const open = paypal.fake.add("SENT");
    withRecipient(open);
    await loadInvoices();

    await recordPayment(open.id, {
      requestId: REQUEST,
      method: "BANK_TRANSFER",
      paidOn: "2026-10-16",
    });

    expect(await statuses()).toEqual({ [open.id]: "MARKED_AS_PAID" });
  });

  it("shows a sent draft as sent on the next read", async () => {
    const draft = paypal.fake.add("DRAFT");
    withRecipient(draft);
    expect(await statuses()).toEqual({});

    await sendExistingDraft(draft.id, REQUEST);

    expect(await statuses()).toEqual({ [draft.id]: "SENT" });
  });

  it("renews the snapshot even when the PayPal write fails after changing the invoice", async () => {
    const open = paypal.fake.add("SENT");
    withRecipient(open);
    await loadInvoices();
    vi.spyOn(paypal.fake, "cancelInvoice").mockImplementation(async (id) => {
      setStatus(id, "CANCELLED");
      throw new Error("PayPal timed out");
    });

    await expect(
      cancelInvoice(open.id, { requestId: REQUEST, notifyClient: false }),
    ).rejects.toThrow();

    expect(await statuses()).toEqual({});
  });

  it("shows an invoice a webhook reports as paid, without waiting for the refresh interval", async () => {
    const open = paypal.fake.add("SENT");
    withRecipient(open);
    expect(await statuses()).toEqual({ [open.id]: "SENT" });

    setStatus(open.id, "PAID");
    await processWebhookEvent({
      id: "WH-1",
      event_type: "INVOICING.INVOICE.PAID",
      resource: { invoice: { id: open.id } },
    });

    expect(await statuses()).toEqual({ [open.id]: "PAID" });
  });

  it("shows the new story and none of the old open invoices after a demo reset", async () => {
    const old = paypal.fake.add("SENT");
    withRecipient(old);
    const draft = paypal.fake.add("DRAFT");
    withRecipient(draft);
    expect(await statuses()).toEqual({ [old.id]: "SENT" });

    await resetDemo();

    const after = await statuses();
    expect(after[old.id]).toBeUndefined();
    expect(Object.keys(after).length).toBeGreaterThan(0);
    expect(paypal.fake.invoices.has(draft.id)).toBe(false);
    const stored = (await loadInvoices()).map(({ summary }) => summary.id);
    expect(stored.every((id) => paypal.fake.invoices.has(id))).toBe(true);
  });

  it("hides and shows an invoice in the demo at once", async () => {
    const open = paypal.fake.add("SENT", "dueline-request:abc");
    withRecipient(open);
    const ids = async () => (await loadVisibleInvoices()).map(({ summary }) => summary.id);
    expect(await ids()).toEqual([open.id]);

    await setInvoiceHiddenInDemo(open.id, true);
    expect(await ids()).toEqual([]);

    await setInvoiceHiddenInDemo(open.id, false);
    expect(await ids()).toEqual([open.id]);
  });
});

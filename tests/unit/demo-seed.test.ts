import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedDemo } from "@/lib/demo/seed";
import { buildDemoProfile, buildDemoStory, DEMO_SAC, demoMemo } from "@/lib/demo/story";
import { ConfigError } from "@/lib/env";
import { PayPalApiError } from "@/lib/paypal/errors";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { EMPTY_PROFILE } from "@/types";
import { createFakePayPal, type FakePayPal } from "../support/fake-paypal";
import { stubEnv } from "../support/env";

const paypal = vi.hoisted(() => ({
  nextInvoiceNumber: vi.fn(),
  createDraftInvoice: vi.fn(),
  sendInvoice: vi.fn(),
  recordExternalPayment: vi.fn(),
  listInvoicesInFull: vi.fn(),
}));

vi.mock("@/lib/paypal/invoices", () => ({
  nextInvoiceNumber: paypal.nextInvoiceNumber,
  createDraftInvoice: paypal.createDraftInvoice,
  sendInvoice: paypal.sendInvoice,
  recordExternalPayment: paypal.recordExternalPayment,
}));
const holder = vi.hoisted(() => ({ store: undefined as Store | undefined }));
vi.mock("@/lib/store", () => ({ getStore: () => holder.store }));
vi.mock("@/lib/paypal/summaries", () => ({ listInvoicesInFull: paypal.listInvoicesInFull }));

const TODAY = "2026-10-31";
const BUYER = "buyer@personal.example.com";
const story = buildDemoStory(TODAY);
const history = story.filter((invoice) => invoice.paidOn);

let fake: FakePayPal;

beforeEach(() => {
  holder.store = createMemoryStore();
  stubEnv({ DEMO_TODAY: TODAY, SANDBOX_BUYER_EMAIL: BUYER });
  vi.spyOn(console, "error").mockImplementation(() => {});
  fake = createFakePayPal();
  paypal.nextInvoiceNumber.mockImplementation(fake.nextInvoiceNumber);
  paypal.createDraftInvoice.mockImplementation(fake.createDraftInvoice);
  paypal.sendInvoice.mockImplementation(fake.sendInvoice);
  paypal.recordExternalPayment.mockImplementation(fake.recordExternalPayment);
  paypal.listInvoicesInFull.mockImplementation(fake.listInvoicesInFull);
});

describe("seedDemo", () => {
  it("creates and sends every story invoice to the sandbox buyer, marked with its key", async () => {
    const rows = await seedDemo();

    expect(rows.map((row) => row.result)).toEqual(story.map(() => "created"));
    expect(fake.calls.sent).toHaveLength(story.length);
    const created = [...fake.invoices.values()];
    expect(created.map((invoice) => invoice.detail.memo)).toEqual(
      story.map((invoice) => demoMemo(invoice.key, invoice.purposeCode, DEMO_SAC)),
    );
    expect(
      created.every((i) => i.primary_recipients?.[0].billing_info.email_address === BUYER),
    ).toBe(true);
    expect(created[0].detail).toMatchObject({
      invoice_date: story[0].issuedOn,
      payment_term: { due_date: story[0].dueOn },
    });
  });

  it("saves the demo profile when none is saved and prints it on every invoice", async () => {
    await seedDemo();

    expect(await holder.store?.getProfile()).toEqual(buildDemoProfile(TODAY));
    const created = [...fake.invoices.values()];
    expect(
      created.every((invoice) => invoice.invoicer?.business_name === "Riya Sharma Design"),
    ).toBe(true);
    expect(created.every((invoice) => invoice.invoicer?.tax_id === "29ABCPS1234C1Z5")).toBe(true);
    expect(created.every((invoice) => invoice.items?.[0].description === "SAC 998391")).toBe(true);
  });

  it("keeps a profile the freelancer saved, and uses it", async () => {
    const saved = { ...EMPTY_PROFILE, yourName: "Asha Rao", businessName: "Asha Rao Studio" };
    await holder.store?.saveProfile(saved);

    await seedDemo();

    expect(await holder.store?.getProfile()).toEqual(saved);
    const header = [...fake.invoices.values()][0].invoicer;
    expect(header).toEqual({
      business_name: "Asha Rao Studio",
      name: { given_name: "Asha", surname: "Rao" },
    });
    expect([...fake.invoices.values()][0].items?.[0]).not.toHaveProperty("description");
  });

  it("records the history as paid outside PayPal on the story's dates, and nothing else", async () => {
    await seedDemo();

    expect(fake.calls.payments.map((payment) => payment.paymentDate)).toEqual(
      history.map((invoice) => invoice.paidOn),
    );
    const statuses = [...fake.invoices.values()].map((invoice) => invoice.status);
    expect(statuses.filter((status) => status === "MARKED_AS_PAID")).toHaveLength(history.length);
    expect(statuses.filter((status) => status === "SENT")).toHaveLength(
      story.length - history.length,
    );
  });

  it("skips what PayPal already has, so a second run changes nothing", async () => {
    await seedDemo();
    const before = fake.invoices.size;
    paypal.createDraftInvoice.mockClear();
    paypal.recordExternalPayment.mockClear();

    const rows = await seedDemo();

    expect(rows.map((row) => row.result)).toEqual(story.map(() => "skipped"));
    expect(fake.invoices.size).toBe(before);
    expect(paypal.createDraftInvoice).not.toHaveBeenCalled();
    expect(paypal.recordExternalPayment).not.toHaveBeenCalled();
  });

  it("carries on after a failure and finishes the missing invoice next time", async () => {
    paypal.createDraftInvoice.mockRejectedValueOnce(
      new PayPalApiError({
        status: 422,
        paypalName: "UNPROCESSABLE",
        message: "No.",
        debugId: "d1",
      }),
    );

    const rows = await seedDemo();
    expect(rows[0]).toMatchObject({ key: story[0].key, result: "failed" });
    expect(rows.slice(1).every((row) => row.result === "created")).toBe(true);
    expect(console.error).toHaveBeenCalledWith("Seeding a demo invoice failed", { debugId: "d1" });

    const again = await seedDemo();
    expect(again.map((row) => row.result)).toEqual([
      "created",
      ...story.slice(1).map(() => "skipped"),
    ]);
  });

  it("finishes a history invoice that was sent but never recorded as paid", async () => {
    const [first] = history;
    fake.add("SENT", demoMemo(first.key));

    const rows = await seedDemo();

    expect(rows.find((row) => row.key === first.key)?.result).toBe("repaired");
    expect(fake.calls.payments[0].paymentDate).toBe(first.paidOn);
    expect(fake.calls.sent).toHaveLength(story.length - 1);
  });

  it("sends a story draft left behind and creates a story invoice that was cancelled", async () => {
    fake.add("DRAFT", demoMemo(story[0].key));
    fake.add("CANCELLED", demoMemo(story[1].key));

    const rows = await seedDemo();

    expect(rows[0].result).toBe("repaired");
    expect(rows[1].result).toBe("created");
  });

  it("never touches a story invoice the client paid through PayPal", async () => {
    const [first] = history;
    fake.add("PAID", demoMemo(first.key));

    const rows = await seedDemo();

    expect(rows.find((row) => row.key === first.key)?.result).toBe("skipped");
    expect(fake.calls.payments.map((payment) => payment.paymentDate)).not.toContain(first.paidOn);
  });

  it("refuses a buyer address that is not a sandbox account, before creating anything", async () => {
    stubEnv({ DEMO_TODAY: TODAY, SANDBOX_BUYER_EMAIL: "someone@example.com" });
    await expect(seedDemo()).rejects.toThrow(ConfigError);
    expect(paypal.createDraftInvoice).not.toHaveBeenCalled();
  });

  it("needs a sandbox buyer address", async () => {
    stubEnv({ DEMO_TODAY: TODAY });
    await expect(seedDemo()).rejects.toThrow(ConfigError);
    expect(paypal.listInvoicesInFull).not.toHaveBeenCalled();
  });
});

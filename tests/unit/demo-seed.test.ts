import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureDemoProfile, seedDemo, seedNewGeneration } from "@/lib/demo/seed";
import { buildDemoProfile, buildDemoStory, DEMO_SAC, demoMemo } from "@/lib/demo/story";
import { ConfigError } from "@/lib/env";
import { PayPalApiError } from "@/lib/paypal/errors";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { EMPTY_PROFILE } from "@/types";
import { createFakePayPal, type FakePayPal } from "@/lib/paypal/offline/fake-paypal";
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
const GENERATION = 3;
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
    const rows = await seedDemo(GENERATION);

    expect(rows.map((row) => row.result)).toEqual(story.map(() => "created"));
    expect(fake.calls.sent).toHaveLength(story.length);
    const created = [...fake.invoices.values()];
    expect(created.map((invoice) => invoice.detail.memo)).toEqual(
      story.map((invoice) => demoMemo(GENERATION, invoice.key, invoice.purposeCode, DEMO_SAC)),
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
    await seedDemo(GENERATION);

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

    await seedDemo(GENERATION);

    expect(await holder.store?.getProfile()).toEqual(saved);
    const header = [...fake.invoices.values()][0].invoicer;
    expect(header).toEqual({
      business_name: "Asha Rao Studio",
      name: { given_name: "Asha", surname: "Rao" },
    });
    expect([...fake.invoices.values()][0].items?.[0]).not.toHaveProperty("description");
  });

  it("records the history as paid outside PayPal on the story's dates, and nothing else", async () => {
    await seedDemo(GENERATION);

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
    await seedDemo(GENERATION);
    const before = fake.invoices.size;
    paypal.createDraftInvoice.mockClear();
    paypal.recordExternalPayment.mockClear();

    const rows = await seedDemo(GENERATION);

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

    const rows = await seedDemo(GENERATION);
    expect(rows[0]).toMatchObject({ key: story[0].key, result: "failed" });
    expect(rows.slice(1).every((row) => row.result === "created")).toBe(true);
    expect(console.error).toHaveBeenCalledWith("Seeding a demo invoice failed", { debugId: "d1" });

    const again = await seedDemo(GENERATION);
    expect(again.map((row) => row.result)).toEqual([
      "created",
      ...story.slice(1).map(() => "skipped"),
    ]);
  });

  it("finishes a history invoice that was sent but never recorded as paid", async () => {
    const [first] = history;
    fake.add("SENT", demoMemo(GENERATION, first.key));

    const rows = await seedDemo(GENERATION);

    expect(rows.find((row) => row.key === first.key)?.result).toBe("repaired");
    expect(fake.calls.payments[0].paymentDate).toBe(first.paidOn);
    expect(fake.calls.sent).toHaveLength(story.length - 1);
  });

  it("sends a story draft left behind and creates a story invoice that was cancelled", async () => {
    fake.add("DRAFT", demoMemo(GENERATION, story[0].key));
    fake.add("CANCELLED", demoMemo(GENERATION, story[1].key));

    const rows = await seedDemo(GENERATION);

    expect(rows[0].result).toBe("repaired");
    expect(rows[1].result).toBe("created");
  });

  it("never touches a story invoice the client paid through PayPal", async () => {
    const [first] = history;
    fake.add("PAID", demoMemo(GENERATION, first.key));

    const rows = await seedDemo(GENERATION);

    expect(rows.find((row) => row.key === first.key)?.result).toBe("skipped");
    expect(fake.calls.payments.map((payment) => payment.paymentDate)).not.toContain(first.paidOn);
  });

  it("refuses a buyer address that is not a sandbox account, before creating anything", async () => {
    stubEnv({ DEMO_TODAY: TODAY, SANDBOX_BUYER_EMAIL: "someone@example.com" });
    await expect(seedDemo(GENERATION)).rejects.toThrow(ConfigError);
    expect(paypal.createDraftInvoice).not.toHaveBeenCalled();
  });

  it("needs a sandbox buyer address", async () => {
    stubEnv({ DEMO_TODAY: TODAY });
    await expect(seedDemo(GENERATION)).rejects.toThrow(ConfigError);
    expect(paypal.listInvoicesInFull).not.toHaveBeenCalled();
  });
});

describe("the story's history and details", () => {
  it("bills each client in its country and writes the LUT line and SAC on every invoice", async () => {
    await seedDemo(GENERATION);

    const created = [...fake.invoices.values()];
    const countries = created.map(
      (invoice) => invoice.primary_recipients?.[0].billing_info.address?.country_code,
    );
    expect(countries).toEqual(story.map((item) => item.country));
    expect(
      created.every((invoice) => invoice.detail.note?.includes("LUT ARN: AD2904260012345")),
    ).toBe(true);
    expect(created.every((invoice) => invoice.items?.[0].description === `SAC ${DEMO_SAC}`)).toBe(
      true,
    );
  });

  it("keeps the payment date on the invoice PayPal returns, so history has paid dates", async () => {
    await seedDemo(GENERATION);

    const dates = [...fake.invoices.values()]
      .filter((invoice) => invoice.status === "MARKED_AS_PAID")
      .map((invoice) => invoice.payments?.transactions?.[0].payment_date);
    expect(dates).toEqual(history.map((item) => item.paidOn));
  });

  it("writes a sent row on the issue date and a paid row on the payment date, at 09:00 India time", async () => {
    await seedDemo(GENERATION);

    const events = await holder.store?.latestActivity(100);
    const first = story[0];
    const sent = events?.find((event) => event.id === `demo:${GENERATION}:${first.key}:sent`);
    const paid = events?.find((event) => event.id === `demo:${GENERATION}:${first.key}:paid`);
    expect(sent?.at).toBe(`${first.issuedOn}T03:30:00.000Z`);
    expect(paid?.at).toBe(`${first.paidOn}T03:30:00.000Z`);
    expect(events).toHaveLength(story.length + history.length);
  });

  it("writes the same rows once however often it runs", async () => {
    await seedDemo(GENERATION);
    await seedDemo(GENERATION);

    expect(await holder.store?.latestActivity(100)).toHaveLength(story.length + history.length);
  });

  it("logs the one past reminder on its date and sends nothing to PayPal for it", async () => {
    await seedDemo(GENERATION);
    await seedDemo(GENERATION);

    const copy = story.find((item) => item.reminder);
    const invoice = [...fake.invoices.values()].find((item) => item.items?.[0].name === copy?.work);
    const log = await holder.store?.reminderHistory(invoice?.id ?? "");
    expect(log).toEqual([
      {
        invoiceId: invoice?.id,
        tone: "gentle",
        sentAt: `${copy?.reminder?.sentOn}T03:30:00.000Z`,
        channel: "paypal",
      },
    ]);
    expect(fake.calls.reminded).toEqual([]);
  });

  it("starts the next generation from today and seeds it", async () => {
    await holder.store?.saveDemoGeneration({ id: 2, seededOn: "2026-10-01" });

    const { generation, rows } = await seedNewGeneration();

    expect(generation).toBe(3);
    expect(rows.every((row) => row.result === "created")).toBe(true);
    expect(await holder.store?.getDemoGeneration()).toEqual({ id: 3, seededOn: TODAY });
    expect([...fake.invoices.values()][0].detail.memo).toContain("dueline-demo:3:");
  });
});

describe("ensureDemoProfile", () => {
  it("fills in a saved profile that has neither a name nor a business name", async () => {
    await holder.store?.saveProfile(EMPTY_PROFILE);

    expect(await ensureDemoProfile(TODAY)).toEqual(buildDemoProfile(TODAY));
  });

  it("moves the demo profile's LUT date on and leaves one a person typed alone", async () => {
    await holder.store?.saveProfile(buildDemoProfile("2025-06-01"));
    expect((await ensureDemoProfile(TODAY)).lutValidUntil).toBe(
      buildDemoProfile(TODAY).lutValidUntil,
    );

    const typed = { ...buildDemoProfile(TODAY), yourName: "Asha Rao" };
    await holder.store?.saveProfile(typed);
    expect(await ensureDemoProfile(TODAY)).toEqual(typed);
  });
});

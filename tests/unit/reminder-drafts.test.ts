import { generateText } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidReminderError } from "@/lib/reminders/errors";
import { InvoiceNotFoundError } from "@/lib/invoices/errors";
import { draftReminderFor, listReminderDrafts } from "@/lib/reminders/reminder-drafts";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import type { InvoiceSummary } from "@/types";
import { stubEnv } from "../support/env";
import { BRIGHTWELL, OKAFOR, openInvoice, overdueInvoice, paidInvoice } from "../support/summaries";

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: vi.fn(),
}));

const loader = vi.hoisted(() => ({ loadInvoices: vi.fn() }));
vi.mock("@/lib/paypal/summaries", () => ({ loadInvoices: loader.loadInvoices }));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

function load(summaries: InvoiceSummary[]): void {
  loader.loadInvoices.mockResolvedValue(
    summaries.map((summary) => ({
      summary,
      amountDue: summary.amount,
      underLut: false,
      paymentId: null,
    })),
  );
}

beforeEach(() => {
  store = createMemoryStore();
  stubEnv({ DEMO_TODAY: "2026-10-31" });
  vi.mocked(generateText).mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("listReminderDrafts", () => {
  it("drafts only overdue invoices, most days late first", async () => {
    const bystander = { name: "Northpine Studio", email: "n@x.example" };
    const five = overdueInvoice("2026-10-26", 5);
    const twenty = overdueInvoice("2026-10-11", 20, BRIGHTWELL);
    const nine = overdueInvoice("2026-10-22", 9, {
      name: "Halden Coffee Co.",
      email: "h@x.example",
    });
    load([
      five,
      paidInvoice("2026-10-01", "2026-10-02", bystander),
      openInvoice("2026-11-20", bystander),
      twenty,
      nine,
      { ...overdueInvoice("2026-10-01", 30, bystander), paypalStatus: "CANCELLED" },
    ]);

    const drafts = await listReminderDrafts();
    expect(drafts.map((draft) => draft.invoiceId)).toEqual([twenty.id, nine.id, five.id]);
    expect(drafts.map((draft) => draft.tone)).toEqual(["firm", "firm", "gentle"]);
    expect(drafts.every((draft) => draft.source === "template")).toBe(true);
  });

  it("suggests a tone one step firmer for a late payer, and says which it started from", async () => {
    const first = overdueInvoice("2026-10-11", 20);
    const second = overdueInvoice("2026-10-22", 9);
    const watched = overdueInvoice("2026-10-26", 5, BRIGHTWELL);
    load([first, second, watched]);

    const drafts = await listReminderDrafts();
    const toneOf = (id: string) => drafts.find((draft) => draft.invoiceId === id)?.suggestedTone;
    expect(toneOf(first.id)).toBe("final");
    expect(toneOf(second.id)).toBe("final");
    expect(toneOf(watched.id)).toBe("gentle");
  });

  it("returns an empty list when nothing is overdue", async () => {
    load([openInvoice("2026-11-20")]);
    expect(await listReminderDrafts()).toEqual([]);
  });

  it("drafts at most 10 invoices", async () => {
    const invoices = Array.from({ length: 13 }, (_, index) =>
      overdueInvoice("2026-10-20", 11 + index),
    );
    load(invoices);

    const drafts = await listReminderDrafts();
    const latest = [...invoices].reverse().slice(0, 10);
    expect(drafts.map((draft) => draft.invoiceId)).toEqual(latest.map((invoice) => invoice.id));
  });

  it("includes each invoice's history, oldest first, and suggests the next tone", async () => {
    const invoice = overdueInvoice("2026-10-26", 5);
    load([invoice]);
    await store.logReminder({
      invoiceId: invoice.id,
      tone: "firm",
      sentAt: "2026-10-29T05:00:00Z",
    });
    await store.logReminder({
      invoiceId: invoice.id,
      tone: "gentle",
      sentAt: "2026-10-27T05:00:00Z",
    });

    const [draft] = await listReminderDrafts();
    expect(draft.history).toEqual([
      { tone: "gentle", sentAt: "2026-10-27T05:00:00Z" },
      { tone: "firm", sentAt: "2026-10-29T05:00:00Z" },
    ]);
    expect(draft.suggestedTone).toBe("final");
    expect(draft.tone).toBe("final");
  });

  it("asks the model for at most 2 drafts at a time", async () => {
    stubEnv({
      DEMO_TODAY: "2026-10-31",
      GEMINI_API_KEY: "test-key",
      GEMINI_MODEL: "primary-model",
    });
    load(Array.from({ length: 6 }, (_, index) => overdueInvoice("2026-10-20", 11 + index)));
    let running = 0;
    let most = 0;
    vi.mocked(generateText).mockImplementation(async () => {
      running += 1;
      most = Math.max(most, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      return { output: { subject: "Hello", message: "Too short" } } as unknown as Awaited<
        ReturnType<typeof generateText>
      >;
    });

    await listReminderDrafts();
    expect(generateText).toHaveBeenCalledTimes(6);
    expect(most).toBe(2);
  });

  it("uses templates, with no model call, once the daily allowance is used up", async () => {
    stubEnv({
      DEMO_TODAY: "2026-10-31",
      GEMINI_API_KEY: "test-key",
      GEMINI_MODEL: "primary-model",
    });
    for (let call = 1; call <= 400; call++) await store.hitRateLimit("ai-calls:2026-10-31", 86_400);
    load([overdueInvoice("2026-10-20", 11)]);

    const [draft] = await listReminderDrafts();
    expect(draft.source).toBe("template");
    expect(generateText).not.toHaveBeenCalled();
  });
});

describe("draftReminderFor", () => {
  it("drafts in the chosen tone and reports the suggested one", async () => {
    const invoice = overdueInvoice("2026-10-26", 5, OKAFOR);
    load([invoice]);
    const draft = await draftReminderFor(invoice.id, "final", {});
    expect(draft).toMatchObject({ invoiceId: invoice.id, tone: "final", suggestedTone: "gentle" });
    expect(draft.subject).toContain("Final reminder");
  });

  it("refuses an unknown invoice", async () => {
    load([]);
    await expect(draftReminderFor("INV2-NOPE", "gentle", {})).rejects.toBeInstanceOf(
      InvoiceNotFoundError,
    );
  });

  it("refuses an invoice that is paid or not yet due", async () => {
    const paid = paidInvoice("2026-10-01", "2026-10-02");
    const open = openInvoice("2026-11-20");
    load([paid, open]);
    await expect(draftReminderFor(paid.id, "gentle", {})).rejects.toThrow("already paid");
    await expect(draftReminderFor(open.id, "gentle", {})).rejects.toBeInstanceOf(
      InvalidReminderError,
    );
  });
});

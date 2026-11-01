import { generateText } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as list } from "@/app/api/reminders/route";
import { POST as draft } from "@/app/api/reminders/draft/route";
import { listReminderDrafts, prepareReminderDrafts } from "@/lib/reminders/reminder-drafts";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import type { InvoiceSummary } from "@/types";
import { stubEnv } from "../support/env";
import { apiCallError } from "../support/ai";
import { OKAFOR, overdueInvoice } from "../support/summaries";
import "../support/next-server";

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
      marker: "dueline-request:test",
    })),
  );
}

function modelAnswers(invoice: InvoiceSummary): void {
  vi.mocked(generateText).mockResolvedValue({
    output: {
      subject: `Reminder about invoice ${invoice.number}`,
      message: `Hi there, invoice ${invoice.number} for EUR 720.00 is overdue. Please use the Pay now button.`,
    },
  } as unknown as Awaited<ReturnType<typeof generateText>>);
}

const invoice = overdueInvoice("2026-10-26", 5, OKAFOR);

beforeEach(() => {
  store = createMemoryStore();
  stubEnv({ DEMO_TODAY: "2026-10-31", GEMINI_API_KEY: "test-key", GEMINI_MODEL: "primary-model" });
  vi.mocked(generateText).mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  load([invoice]);
});

afterEach(() => vi.restoreAllMocks());

describe("GET /api/reminders answers at once", () => {
  it("returns the template, marked pending, without calling the model", async () => {
    const [first] = await listReminderDrafts();

    expect(first).toMatchObject({ invoiceId: invoice.id, source: "template", pending: true });
    expect(first.subject).toContain(invoice.number);
    expect(generateText).not.toHaveBeenCalled();
  });

  it("returns the model's earlier draft, not pending, when one is stored", async () => {
    modelAnswers(invoice);
    await prepareReminderDrafts();
    vi.mocked(generateText).mockClear();

    const [first] = await listReminderDrafts();
    expect(first).toMatchObject({ source: "ai", pending: false });
    expect(first.subject).toBe(`Reminder about invoice ${invoice.number}`);
    expect(generateText).not.toHaveBeenCalled();
  });

  it("does not wait for any of the drafts", async () => {
    load(Array.from({ length: 6 }, (_, index) => overdueInvoice("2026-10-20", 11 + index)));
    vi.mocked(generateText).mockImplementation(() => new Promise(() => {}));

    const drafts = await listReminderDrafts();
    expect(drafts).toHaveLength(6);
    expect(drafts.every((entry) => entry.pending)).toBe(true);
  });

  it("answers over HTTP with the pending flag on every draft", async () => {
    const body = await (await list()).json();
    expect(body.drafts).toHaveLength(1);
    expect(body.drafts[0]).toMatchObject({ pending: true, language: "en" });
    expect(typeof body.remindersLeftToday).toBe("number");
  });

  it("writes in the client's language, and says so", async () => {
    await store.saveClientLanguage("okafor-reyes", "de");
    const [first] = await listReminderDrafts();
    expect(first.language).toBe("de");
    expect(first.message).toContain("Rechnung");
    expect(first.message.endsWith("Vielen Dank")).toBe(true);
  });
});

describe("POST /api/reminders/draft improves a pending draft", () => {
  function post(body: unknown): Promise<Response> {
    return draft(
      new Request("http://localhost:3000/api/reminders/draft", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.7" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("asks the model and answers a finished draft", async () => {
    modelAnswers(invoice);
    const response = await post({ invoiceId: invoice.id, tone: "gentle" });
    expect(await response.json()).toMatchObject({ source: "ai", pending: false, language: "en" });

    // The next listing finds it ready.
    const [listed] = await listReminderDrafts();
    expect(listed).toMatchObject({ source: "ai", pending: false });
  });

  it("answers a finished template when the model has nothing usable", async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: { subject: "Hello", message: "Too short" },
    } as unknown as Awaited<ReturnType<typeof generateText>>);
    const body = await (await post({ invoiceId: invoice.id, tone: "gentle" })).json();
    expect(body).toMatchObject({ source: "template", pending: false });
  });

  it("writes in the language it is asked for, instead of the client's", async () => {
    await store.saveClientLanguage("okafor-reyes", "de");
    vi.mocked(generateText).mockRejectedValue(apiCallError(503));
    const body = await (await post({ invoiceId: invoice.id, tone: "firm", language: "en" })).json();
    expect(body.language).toBe("en");
    expect(body.message).toContain("overdue");
  });

  it("refuses a language that is not offered", async () => {
    expect((await post({ invoiceId: invoice.id, tone: "gentle", language: "zz" })).status).toBe(
      400,
    );
  });
});

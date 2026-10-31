import { generateText } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getRisk } from "@/app/api/clients/risk/route";
import { POST as draft } from "@/app/api/reminders/draft/route";
import { GET as list } from "@/app/api/reminders/route";
import { POST as send } from "@/app/api/reminders/send/route";
import { PayPalApiError } from "@/lib/paypal/errors";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { stubEnv } from "../support/env";
import { OKAFOR, openInvoice, overdueInvoice, paidInvoice } from "../support/summaries";
import unpaidFixture from "../fixtures/paypal/invoice-unpaid.json";

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: vi.fn(),
}));

const paypal = vi.hoisted(() => ({
  loadInvoices: vi.fn(),
  getInvoice: vi.fn(),
  remindInvoice: vi.fn(),
}));

vi.mock("@/lib/paypal/summaries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/paypal/summaries")>()),
  loadInvoices: paypal.loadInvoices,
  findInvoiceByMemo: vi.fn(),
  clearInvoiceCaches: vi.fn(),
}));
vi.mock("@/lib/paypal/invoices", () => ({
  nextInvoiceNumber: vi.fn(),
  createDraftInvoice: vi.fn(),
  sendInvoice: vi.fn(),
  getInvoice: paypal.getInvoice,
  remindInvoice: paypal.remindInvoice,
}));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

const origin = "http://localhost:3000";
const requestId = "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c";
const unpaid = unpaidFixture as PayPalInvoice;
const overdue = overdueInvoice("2026-10-26", 5);

const sendBody = {
  invoiceId: unpaid.id,
  subject: "A quick reminder about invoice INV-0101",
  message:
    "Hi Tandem Health team,\n\nInvoice INV-0101 is overdue. Please use Pay now.\n\nThank you",
  tone: "gentle",
  requestId,
};

function post(path: string, body: unknown, address = "198.51.100.1"): Request {
  return new Request(`${origin}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": address },
    body: JSON.stringify(body),
  });
}

function load(...summaries: ReturnType<typeof overdueInvoice>[]): void {
  paypal.loadInvoices.mockResolvedValue(
    summaries.map((summary) => ({
      summary,
      amountDue: summary.amount,
      underLut: false,
      paymentId: null,
    })),
  );
}

async function errorOf(response: Response): Promise<{ code: string; message: string }> {
  return (await response.json()).error;
}

beforeEach(() => {
  store = createMemoryStore();
  stubEnv({ DEMO_TODAY: "2026-11-05" });
  vi.resetAllMocks();
  paypal.getInvoice.mockResolvedValue(unpaid);
  paypal.remindInvoice.mockResolvedValue(undefined);
  load(overdue);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("GET /api/clients/risk", () => {
  it("reports the client's history", async () => {
    load(paidInvoice("2026-08-01", "2026-08-13"), paidInvoice("2026-09-01", "2026-09-17"));
    const response = await getRisk(
      new Request(`${origin}/api/clients/risk?email=${OKAFOR.email}&name=okafor%20%26%20reyes`),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      clientEmail: OKAFOR.email,
      clientName: "Okafor & Reyes",
      level: "late_payer",
      suggestion: { kind: "early_payment_discount", percent: 2, withinDays: 7 },
    });
  });

  it("answers 400 for an email that is not one", async () => {
    const response = await getRisk(new Request(`${origin}/api/clients/risk?email=nope`));
    expect(response.status).toBe(400);
    expect((await errorOf(response)).code).toBe("invalid_request");
  });
});

describe("GET /api/reminders", () => {
  it("drafts a reminder for each overdue invoice", async () => {
    load(overdue, openInvoice("2026-11-20"), overdueInvoice("2026-10-11", 20));
    const response = await list();

    expect(response.status).toBe(200);
    const { drafts } = await response.json();
    expect(drafts.map((entry: { tone: string }) => entry.tone)).toEqual(["firm", "gentle"]);
    expect(drafts[0]).toMatchObject({ source: "template", history: [] });
  });
});

describe("POST /api/reminders/draft", () => {
  it("re-drafts in the chosen tone", async () => {
    const response = await draft(
      post("/api/reminders/draft", { invoiceId: overdue.id, tone: "firm" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ tone: "firm", suggestedTone: "gentle" });
  });

  it("answers 404 for an unknown invoice and 400 for a paid one", async () => {
    const unknown = await draft(post("/api/reminders/draft", { invoiceId: "nope", tone: "firm" }));
    expect(unknown.status).toBe(404);

    const paid = paidInvoice("2026-10-01", "2026-10-02");
    load(paid);
    const refused = await draft(post("/api/reminders/draft", { invoiceId: paid.id, tone: "firm" }));
    expect(refused.status).toBe(400);
    expect((await errorOf(refused)).message).toBe("This invoice is already paid.");
  });

  it("answers 400 for a tone that does not exist", async () => {
    const response = await draft(
      post("/api/reminders/draft", { invoiceId: overdue.id, tone: "angry" }),
    );
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toContain("tone");
  });

  it("answers 429 after 20 drafts an hour from one address", async () => {
    stubEnv({ DEMO_TODAY: "2026-11-05", GEMINI_API_KEY: "test-key", GEMINI_MODEL: "primary" });
    vi.mocked(generateText).mockResolvedValue({
      output: { subject: "Hello", message: "Too short to use" },
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    for (let n = 1; n <= 20; n++) {
      const ok = await draft(post("/api/reminders/draft", { invoiceId: overdue.id, tone: "firm" }));
      expect(ok.status).toBe(200);
    }
    const blocked = await draft(
      post("/api/reminders/draft", { invoiceId: overdue.id, tone: "firm" }),
    );
    expect(blocked.status).toBe(429);
    const { code, message } = await errorOf(blocked);
    expect(code).toBe("rate_limited");
    expect(message).toContain("20 reminder drafts");

    const other = await draft(
      post("/api/reminders/draft", { invoiceId: overdue.id, tone: "firm" }, "198.51.100.2"),
    );
    expect(other.status).toBe(200);
  });
});

describe("POST /api/reminders/send", () => {
  it("returns when the reminder was sent", async () => {
    const response = await send(post("/api/reminders/send", sendBody));
    expect(response.status).toBe(200);
    expect(Object.keys(await response.json())).toEqual(["sentAt"]);
  });

  it.each([
    ["subject", { subject: "Hi" }],
    ["message", { message: "Too short" }],
    ["tone", { tone: undefined }],
  ])("answers 400 naming the %s when it breaks the rules", async (field, change) => {
    const response = await send(post("/api/reminders/send", { ...sendBody, ...change }));
    expect(response.status).toBe(400);
    const { code, message } = await errorOf(response);
    expect(code).toBe("invalid_request");
    expect(message.startsWith(`${field}:`)).toBe(true);
    expect(paypal.remindInvoice).not.toHaveBeenCalled();
  });

  it.each([
    ["message", { message: "Please pay at https://pay.example.org today, thank you." }],
    ["message", { message: "Please write to ana@okafor.example about invoice INV-0101." }],
    ["subject", { subject: "Pay at www.pay.example.org" }],
  ])("answers 400 naming the %s when it holds a link or an address", async (field, change) => {
    const response = await send(post("/api/reminders/send", { ...sendBody, ...change }));
    expect(response.status).toBe(400);
    const { code, message } = await errorOf(response);
    expect(code).toBe("invalid_request");
    expect(message).toBe(`The ${field} must not contain links or email addresses.`);
    expect(paypal.remindInvoice).not.toHaveBeenCalled();
  });

  it("answers 403 before reminding when the client is not a sandbox buyer", async () => {
    paypal.getInvoice.mockResolvedValue({
      ...unpaid,
      primary_recipients: [{ billing_info: { email_address: "client@acme.example" } }],
    });
    const response = await send(post("/api/reminders/send", sendBody));
    expect(response.status).toBe(403);
    expect((await errorOf(response)).code).toBe("recipient_not_allowed");
    expect(paypal.remindInvoice).not.toHaveBeenCalled();
  });

  it("answers 429 for a second reminder the same day", async () => {
    await send(post("/api/reminders/send", sendBody));
    const second = await send(
      post("/api/reminders/send", {
        ...sendBody,
        requestId: "9a1c7e52-0b3d-4f6a-8d2e-5c4b3a291807",
      }),
    );
    expect(second.status).toBe(429);
    expect((await errorOf(second)).message).toBe(
      "A reminder was already sent today for this invoice.",
    );
  });

  it("answers 429 with PayPal's limit when PayPal refuses", async () => {
    paypal.remindInvoice.mockRejectedValue(
      new PayPalApiError({ status: 429, paypalName: "RATE_LIMIT", message: "Too many" }),
    );
    const response = await send(post("/api/reminders/send", sendBody));
    expect(response.status).toBe(429);
    expect((await errorOf(response)).message).toBe(
      "PayPal allows two reminders a day for this account. Try again tomorrow.",
    );
  });

  it("answers 400 for an invoice that is not overdue", async () => {
    stubEnv({ DEMO_TODAY: "2026-10-20" });
    const response = await send(post("/api/reminders/send", sendBody));
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("This invoice is not overdue.");
  });
});

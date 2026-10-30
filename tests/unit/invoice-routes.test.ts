import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getDemoRecipient } from "@/app/api/demo/recipient/route";
import { POST as sendInvoice } from "@/app/api/invoices/[id]/send/route";
import { POST as createInvoice } from "@/app/api/invoices/route";
import { GET as getPurposeCodes } from "@/app/api/purpose-codes/route";
import { STUB_HEADER } from "@/app/api/_lib/stub";
import {
  CreateOutcomeUnknownError,
  DuplicateRequestError,
  InvoiceNotFoundError,
  RecipientNotAllowedError,
} from "@/lib/invoices/errors";
import { PayPalApiError } from "@/lib/paypal/errors";
import { PURPOSE_CODES } from "@/lib/export/purpose-codes";
import { extraction, haldenLabelsInvoice } from "@/mocks/fixtures";
import { stubEnv } from "../support/env";

const service = vi.hoisted(() => ({
  createAndSendInvoice: vi.fn(),
  sendExistingDraft: vi.fn(),
}));

vi.mock("@/lib/invoices/create-invoice", () => service);

// connection() only works inside a Next.js request, which a direct call to the handler is not.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));

const requestId = "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c";

function post(body: unknown): Request {
  return new Request("http://localhost:3000/api/invoices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createBody(changes: Record<string, unknown> = {}, draft: Record<string, unknown> = {}) {
  return { draft: { ...extraction.draft, ...draft }, requestId, ...changes };
}

async function errorOf(response: Response): Promise<{ code: string; message: string }> {
  return (await response.json()).error;
}

beforeEach(() => {
  vi.resetAllMocks();
  stubEnv({ DEMO_TODAY: "2026-10-30" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/invoices", () => {
  it("creates and sends the invoice for a valid request", async () => {
    const stored = { invoice: haldenLabelsInvoice, sent: true };
    service.createAndSendInvoice.mockResolvedValue(stored);

    const response = await createInvoice(
      post(createBody({ discount: { percent: 2, withinDays: 7 } })),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get(STUB_HEADER)).toBeNull();
    expect(await response.json()).toEqual(stored);
    expect(service.createAndSendInvoice).toHaveBeenCalledWith(
      { draft: extraction.draft, discount: { percent: 2, withinDays: 7 } },
      requestId,
    );
  });

  it("accepts a due date of today", async () => {
    service.createAndSendInvoice.mockResolvedValue({ invoice: haldenLabelsInvoice, sent: true });
    const response = await createInvoice(post(createBody({}, { dueOn: "2026-10-30" })));
    expect(response.status).toBe(200);
  });

  it("refuses a due date in the past before anything is created", async () => {
    const response = await createInvoice(post(createBody({}, { dueOn: "2026-10-29" })));
    expect(response.status).toBe(400);
    expect(await errorOf(response)).toEqual({
      code: "invalid_request",
      message: "dueOn must be today or later",
    });
    expect(service.createAndSendInvoice).not.toHaveBeenCalled();
  });

  it.each([
    ["a discount over 20%", { percent: 21, withinDays: 7 }, "discount.percent"],
    ["a discount under 1%", { percent: 0.5, withinDays: 7 }, "discount.percent"],
    ["fewer than 3 days", { percent: 2, withinDays: 2 }, "discount.withinDays"],
    ["more than 30 days", { percent: 2, withinDays: 31 }, "discount.withinDays"],
  ])("refuses %s", async (_name, discount, field) => {
    const response = await createInvoice(post(createBody({ discount })));
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toContain(field);
    expect(service.createAndSendInvoice).not.toHaveBeenCalled();
  });

  it("refuses a request without a due date or a UUID request ID", async () => {
    expect((await createInvoice(post(createBody({}, { dueOn: null })))).status).toBe(400);
    expect((await createInvoice(post(createBody({ requestId: "abc" })))).status).toBe(400);
  });

  it.each([
    [new RecipientNotAllowedError(), 403, "recipient_not_allowed"],
    [new DuplicateRequestError("Still being created."), 409, "duplicate_request"],
    [new CreateOutcomeUnknownError(), 504, "paypal_timeout"],
    [
      new PayPalApiError({ status: 422, paypalName: "X", message: "Bad.", debugId: "dbg1" }),
      502,
      "paypal_error",
    ],
  ])("maps %s to %s %s", async (failure, status, code) => {
    service.createAndSendInvoice.mockRejectedValue(failure);
    const response = await createInvoice(post(createBody()));
    expect(response.status).toBe(status);
    expect((await errorOf(response)).code).toBe(code);
  });

  it("tells the user to check Receivables when PayPal does not answer", async () => {
    service.createAndSendInvoice.mockRejectedValue(new CreateOutcomeUnknownError());
    const error = await errorOf(await createInvoice(post(createBody())));
    expect(error.message).toBe(
      "PayPal did not answer in time. Check Receivables before trying again.",
    );
  });

  it("carries PayPal's debug ID on a PayPal error", async () => {
    service.createAndSendInvoice.mockRejectedValue(
      new PayPalApiError({ status: 422, paypalName: "X", message: "Bad.", debugId: "dbg1" }),
    );
    const body = await (await createInvoice(post(createBody()))).json();
    expect(body.error.debugId).toBe("dbg1");
  });
});

describe("POST /api/invoices/{id}/send", () => {
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

  it("sends the draft with the request ID from the body", async () => {
    const stored = { invoice: haldenLabelsInvoice, sent: true };
    service.sendExistingDraft.mockResolvedValue(stored);

    const response = await sendInvoice(post({ requestId }), ctx("INV2-NEW"));
    expect(response.status).toBe(200);
    expect(response.headers.get(STUB_HEADER)).toBeNull();
    expect(await response.json()).toEqual(stored);
    expect(service.sendExistingDraft).toHaveBeenCalledWith("INV2-NEW", requestId);
  });

  it("answers 404 not_found for an unknown invoice", async () => {
    service.sendExistingDraft.mockRejectedValue(new InvoiceNotFoundError());
    const response = await sendInvoice(post({ requestId }), ctx("missing"));
    expect(response.status).toBe(404);
    expect((await errorOf(response)).code).toBe("not_found");
  });

  it("refuses a request ID that is not a UUID", async () => {
    const response = await sendInvoice(post({ requestId: "abc" }), ctx("INV2-NEW"));
    expect(response.status).toBe(400);
    expect(service.sendExistingDraft).not.toHaveBeenCalled();
  });
});

describe("GET /api/purpose-codes", () => {
  it("returns the fixed list", async () => {
    const response = await getPurposeCodes();
    expect(response.headers.get(STUB_HEADER)).toBeNull();
    expect(await response.json()).toEqual({ codes: PURPOSE_CODES });
  });
});

describe("GET /api/demo/recipient", () => {
  it("returns the sandbox buyer in demo mode", async () => {
    stubEnv({ SANDBOX_BUYER_EMAIL: "buyer@personal.example.com" });
    const response = await getDemoRecipient();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ email: "buyer@personal.example.com" });
  });

  it("answers 404 when no buyer is set", async () => {
    const response = await getDemoRecipient();
    expect(response.status).toBe(404);
    expect((await errorOf(response)).code).toBe("not_found");
  });

  it("answers 404 when demo mode is off", async () => {
    stubEnv({ DEMO_MODE: "false", SANDBOX_BUYER_EMAIL: "buyer@personal.example.com" });
    expect((await getDemoRecipient()).status).toBe(404);
  });
});

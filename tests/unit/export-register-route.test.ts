import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/export-register/route";
import { STUB_HEADER } from "@/app/api/_lib/stub";
import { PayPalApiError } from "@/lib/paypal/errors";
import type { LoadedInvoice } from "@/lib/paypal/summaries";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { haldenLabelsInvoice } from "@/mocks/fixtures";
import { stubEnv } from "../support/env";

const holder = vi.hoisted(() => ({ store: undefined as Store | undefined }));
const paypal = vi.hoisted(() => ({ loadInvoices: vi.fn() }));
vi.mock("@/lib/store", () => ({ getStore: () => holder.store }));
vi.mock("@/lib/paypal/summaries", () => ({ loadInvoices: paypal.loadInvoices }));

const paid: LoadedInvoice = {
  summary: haldenLabelsInvoice,
  amountDue: haldenLabelsInvoice.amount,
  underLut: true,
  paymentId: null,
};

function get(query: string): Promise<Response> {
  return GET(new Request(`http://localhost:3000/api/export-register?${query}`));
}

beforeEach(() => {
  stubEnv({ DEMO_TODAY: "2026-10-30" });
  holder.store = createMemoryStore();
  paypal.loadInvoices.mockReset();
  paypal.loadInvoices.mockResolvedValue([paid]);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network in tests"));
});

afterEach(() => vi.restoreAllMocks());

describe("GET /api/export-register", () => {
  it("returns the register as JSON", async () => {
    const response = await get("month=2026-10");
    expect(response.status).toBe(200);
    expect(response.headers.get(STUB_HEADER)).toBeNull();
    const body = await response.json();
    expect(body).toMatchObject({
      month: "2026-10",
      totalInr: 35617,
      paypalInr: 35617,
      estimatedInr: 0,
      totalsByCurrency: [{ currency: "USD", value: "450.00" }],
      missingPurposeCodes: 0,
    });
    expect(body.rows).toHaveLength(1);
  });

  it("returns the same rows as a CSV attachment", async () => {
    const response = await get("month=2026-10&format=csv");
    expect(response.status).toBe(200);
    expect(response.headers.get(STUB_HEADER)).toBeNull();
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="dueline-export-2026-10.csv"',
    );
    const lines = (await response.text()).replace(/^﻿/, "").trimEnd().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("INV-0042");
  });

  it("answers a month with no paid invoices with an empty register", async () => {
    const body = await (await get("month=2026-09")).json();
    expect(body).toMatchObject({ rows: [], totalInr: 0, totalsByCurrency: [] });
  });

  it("answers 400 invalid_request for a month that is not YYYY-MM", async () => {
    const response = await get("month=October");
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatchObject({
      code: "invalid_request",
      message: expect.stringContaining("month"),
    });
  });

  it("answers 400 invalid_request for a month after the current one", async () => {
    const response = await get("month=2026-11");
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
    expect(paypal.loadInvoices).not.toHaveBeenCalled();
  });

  it("accepts the current month", async () => {
    expect((await get("month=2026-10")).status).toBe(200);
  });

  it("answers 502 paypal_error with the debug id when PayPal fails", async () => {
    paypal.loadInvoices.mockRejectedValue(
      new PayPalApiError({
        status: 500,
        paypalName: "INTERNAL_SERVER_ERROR",
        message: "Try later.",
        debugId: "dbg123",
      }),
    );
    const response = await get("month=2026-10");
    expect(response.status).toBe(502);
    expect((await response.json()).error).toMatchObject({
      code: "paypal_error",
      debugId: "dbg123",
    });
  });
});

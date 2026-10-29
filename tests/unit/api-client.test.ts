import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, exportRegisterCsvUrl, getInvoices, getReminders } from "@/lib/api-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("turns an ApiError response into an ApiClientError", async () => {
    const body = { error: { code: "paypal_error", message: "PayPal said no.", debugId: "abc123" } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body, { status: 502 })));

    const error = await getInvoices().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      status: 502,
      code: "paypal_error",
      message: "PayPal said no.",
      debugId: "abc123",
    });
  });

  it("falls back to a plain error when the response is not an ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 500 })));

    await expect(getInvoices()).rejects.toMatchObject({ status: 500, code: "unexpected_response" });
  });

  it("unwraps list responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ drafts: [] })));

    await expect(getReminders()).resolves.toEqual([]);
  });

  it("builds the CSV download URL", () => {
    expect(exportRegisterCsvUrl("2026-10")).toBe("/api/export-register?month=2026-10&format=csv");
  });
});

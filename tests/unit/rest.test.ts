import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PayPalApiError, PayPalTimeoutError } from "@/lib/paypal/errors";
import { paypalFetch } from "@/lib/paypal/rest";
import { clearAccessToken } from "@/lib/paypal/token";
import { stubEnv } from "../support/env";
import { callsTo, jsonResponse, mockPayPal, TOKEN_PATH } from "../support/http";

const PATH = "/v2/invoicing/invoices/INV2-1";

async function failureOf(call: () => Promise<unknown>): Promise<unknown> {
  try {
    await call();
  } catch (error) {
    return error;
  }
  throw new Error("Expected the call to fail");
}

describe("paypalFetch", () => {
  beforeEach(() => {
    stubEnv();
    clearAccessToken();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("sends the bearer token and JSON headers", async () => {
    const spy = mockPayPal(() => jsonResponse({ id: "INV2-1" }));
    const result = await paypalFetch<{ id: string }>(PATH, { method: "POST", body: { a: 1 } });
    expect(result).toEqual({ id: "INV2-1" });

    const headers = spy.mock.calls[1][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-1");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["PayPal-Request-Id"]).toBeUndefined();
    expect(spy.mock.calls[1][1]?.body).toBe('{"a":1}');
  });

  it.each([undefined, "false"])(
    "calls PayPal itself, never the offline stand-in, when DUELINE_OFFLINE is %s",
    async (flag) => {
      stubEnv(flag ? { DUELINE_OFFLINE: flag } : {});
      const spy = mockPayPal(() => jsonResponse({ id: "INV2-1" }));

      expect(await paypalFetch<{ id: string }>(PATH)).toEqual({ id: "INV2-1" });
      expect(callsTo(spy, TOKEN_PATH)).toBe(1);
      expect(callsTo(spy, PATH)).toBe(1);
    },
  );

  it("sends PayPal-Request-Id only when a request id is given", async () => {
    const spy = mockPayPal(() => jsonResponse({}));
    await paypalFetch(PATH, { method: "POST", requestId: "req-1" });
    const headers = spy.mock.calls[1][1]?.headers as Record<string, string>;
    expect(headers["PayPal-Request-Id"]).toBe("req-1");
  });

  it("returns undefined for an empty response body", async () => {
    mockPayPal(() => new Response(null, { status: 202 }));
    expect(await paypalFetch<void>(PATH, { method: "POST" })).toBeUndefined();
  });

  it("reads the debug id from the error body", async () => {
    mockPayPal(() =>
      jsonResponse(
        { name: "INVALID_REQUEST", message: "Bad invoice.", debug_id: "abc123", details: [] },
        { status: 400 },
      ),
    );
    const error = await failureOf(() => paypalFetch(PATH));
    expect(error).toBeInstanceOf(PayPalApiError);
    expect(error).toMatchObject({
      status: 400,
      paypalName: "INVALID_REQUEST",
      message: "Bad invoice.",
      debugId: "abc123",
    });
  });

  it("falls back to the paypal-debug-id header", async () => {
    mockPayPal(
      () =>
        new Response("upstream failure", { status: 500, headers: { "paypal-debug-id": "hdr456" } }),
    );
    const error = await failureOf(() => paypalFetch(PATH));
    expect(error).toMatchObject({ status: 500, debugId: "hdr456" });
  });

  it("turns a timeout into PayPalTimeoutError", async () => {
    mockPayPal(() => {
      throw new DOMException("timed out", "TimeoutError");
    });
    const error = await failureOf(() => paypalFetch(PATH));
    expect(error).toBeInstanceOf(PayPalTimeoutError);
    expect((error as Error).message).toContain("check PayPal before retrying");
  });

  it("clears the token and retries once on a 401", async () => {
    let attempts = 0;
    const spy = mockPayPal(() => {
      attempts += 1;
      return attempts === 1
        ? jsonResponse({ name: "AUTHENTICATION_FAILURE", message: "Expired." }, { status: 401 })
        : jsonResponse({ id: "INV2-1" });
    });
    expect(await paypalFetch(PATH)).toEqual({ id: "INV2-1" });
    expect(callsTo(spy, TOKEN_PATH)).toBe(2);
    expect(callsTo(spy, PATH)).toBe(2);
  });

  it("gives up after a second 401", async () => {
    const spy = mockPayPal(() => jsonResponse({ name: "AUTHENTICATION_FAILURE" }, { status: 401 }));
    const error = await failureOf(() => paypalFetch(PATH));
    expect(error).toMatchObject({ status: 401 });
    expect(callsTo(spy, PATH)).toBe(2);
  });
});

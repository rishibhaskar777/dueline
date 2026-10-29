import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, getAccessToken } from "@/lib/paypal/token";
import { callsTo, mockPayPal, TOKEN_PATH } from "../support/http";
import { stubEnv } from "../support/env";
import { jsonResponse } from "../support/http";

const MINUTE = 60 * 1000;

describe("getAccessToken", () => {
  beforeEach(() => {
    stubEnv();
    clearAccessToken();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("asks PayPal with basic auth and the client credentials grant", async () => {
    const spy = mockPayPal(() => jsonResponse({}));
    await getAccessToken();
    const [url, init] = spy.mock.calls[0];
    expect(String(url)).toBe(`https://api-m.sandbox.paypal.com${TOKEN_PATH}`);
    expect(init?.body).toBe("grant_type=client_credentials");
    const expected = `Basic ${Buffer.from("test-client:test-secret").toString("base64")}`;
    expect((init?.headers as Record<string, string>).Authorization).toBe(expected);
  });

  it("is cached until five minutes before expiry", async () => {
    const spy = mockPayPal(() => jsonResponse({}));
    await getAccessToken();
    vi.advanceTimersByTime(8 * 60 * MINUTE + 54 * MINUTE);
    await getAccessToken();
    expect(callsTo(spy, TOKEN_PATH)).toBe(1);

    vi.advanceTimersByTime(2 * MINUTE);
    await getAccessToken();
    expect(callsTo(spy, TOKEN_PATH)).toBe(2);
  });

  it("shares one request between concurrent callers", async () => {
    const spy = mockPayPal(() => jsonResponse({}));
    const tokens = await Promise.all([getAccessToken(), getAccessToken(), getAccessToken()]);
    expect(tokens).toEqual(["token-1", "token-1", "token-1"]);
    expect(callsTo(spy, TOKEN_PATH)).toBe(1);
  });
});

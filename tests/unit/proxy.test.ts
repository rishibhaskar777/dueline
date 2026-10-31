import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "@/proxy";
import { DEMO_COOKIE_NAME } from "@/lib/demo-access/constants";
import { createSessionToken } from "@/lib/demo-access/session";
import { stubEnv } from "../support/env";

const secret = "s".repeat(32);
const origin = "http://localhost:3000";

function request(path: string, init: { method?: string; token?: string } = {}): NextRequest {
  return new NextRequest(`${origin}${path}`, {
    method: init.method,
    headers: init.token ? { cookie: `${DEMO_COOKIE_NAME}=${init.token}` } : undefined,
  });
}

function passedThrough(response: Response): boolean {
  return response.headers.get("x-middleware-next") === "1";
}

beforeEach(() => stubEnv({ DEMO_PASSWORD: "open sesame", SESSION_SECRET: secret }));

afterEach(() => vi.unstubAllEnvs());

describe("proxy matcher", () => {
  it("covers the API and the app screens but not the landing or sign-in pages", () => {
    expect(config.matcher).toEqual([
      "/api/:path*",
      "/receivables",
      "/invoices/:path*",
      "/nudges",
      "/export",
      "/settings",
      "/demo-tools",
    ]);
  });
});

describe("public routes", () => {
  it.each([
    ["GET", "/api/health"],
    ["POST", "/api/webhooks/paypal"],
    ["POST", "/api/demo/session"],
    ["DELETE", "/api/demo/session"],
  ])("lets %s %s through without a cookie", async (method, path) => {
    expect(passedThrough(await proxy(request(path, { method })))).toBe(true);
  });

  it("does not open other methods on those paths", async () => {
    expect((await proxy(request("/api/webhooks/paypal"))).status).toBe(401);
    expect((await proxy(request("/api/health", { method: "POST" }))).status).toBe(401);
  });
});

describe("protected routes", () => {
  it("answers a protected API route with 401 in the contract's shape", async () => {
    const response = await proxy(request("/api/invoices"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "unauthorized", message: "Enter the demo password to continue." },
    });
  });

  it("redirects a protected screen to the sign-in page and keeps the path", async () => {
    const response = await proxy(request("/export?month=2026-10"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/demo");
    expect(location.searchParams.get("next")).toBe("/export?month=2026-10");
  });

  it("lets a valid cookie through", async () => {
    const token = await createSessionToken(secret, new Date());
    expect(passedThrough(await proxy(request("/api/invoices", { token })))).toBe(true);
    expect(passedThrough(await proxy(request("/receivables", { token })))).toBe(true);
  });

  it("refuses a cookie signed with another secret or already expired", async () => {
    const stranger = await createSessionToken("x".repeat(32), new Date());
    const old = await createSessionToken(secret, new Date(Date.now() - 8 * 86_400_000));
    expect((await proxy(request("/api/invoices", { token: stranger }))).status).toBe(401);
    expect((await proxy(request("/api/invoices", { token: old }))).status).toBe(401);
  });

  it("leaves everything open when no password is set outside production", async () => {
    stubEnv();
    expect(passedThrough(await proxy(request("/api/invoices")))).toBe(true);
    expect(passedThrough(await proxy(request("/settings")))).toBe(true);
  });
});

describe("production without configuration", () => {
  beforeEach(() => {
    stubEnv();
    vi.stubEnv("NODE_ENV", "production");
  });

  it("answers a protected API route with 500 config_error naming the settings", async () => {
    const response = await proxy(request("/api/invoices"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "config_error",
        message: "Missing or invalid settings: DEMO_PASSWORD, SESSION_SECRET.",
      },
    });
  });

  it("shows the not-configured page for a protected screen", async () => {
    const response = await proxy(request("/receivables"));
    expect(response.headers.get("x-middleware-rewrite")).toBe(`${origin}/not-configured`);
  });

  it("keeps the public routes available", async () => {
    expect(passedThrough(await proxy(request("/api/health")))).toBe(true);
  });
});

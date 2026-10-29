import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, POST } from "@/app/api/demo/session/route";
import { DEMO_COOKIE_NAME } from "@/lib/demo-access/constants";
import { verifySessionToken } from "@/lib/demo-access/session";
import { stubEnv } from "../support/env";

const secret = "s".repeat(32);

function signIn(password: unknown, address: string): Request {
  return new Request("http://localhost:3000/api/demo/session", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `${address}, 10.0.0.1` },
    body: JSON.stringify({ password }),
  });
}

beforeEach(() => stubEnv({ DEMO_PASSWORD: "open sesame", SESSION_SECRET: secret }));

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/demo/session", () => {
  it("sets a signed cookie for the right password", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await POST(signIn("open sesame", "198.51.100.1"));
    expect(response.status).toBe(204);

    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${DEMO_COOKIE_NAME}=`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Path=\//i);
    expect(cookie).toMatch(/Max-Age=604800/i);
    expect(cookie).toMatch(/Secure/i);

    const token = new NextRequest("http://localhost:3000", { headers: { cookie } }).cookies.get(
      DEMO_COOKIE_NAME,
    )?.value;
    expect(await verifySessionToken(token ?? "", secret, new Date())).toBe(true);
  });

  it("leaves Secure off outside production", async () => {
    const response = await POST(signIn("open sesame", "198.51.100.2"));
    expect(response.headers.get("set-cookie")).not.toMatch(/Secure/i);
  });

  it("answers 401 for a wrong password and sets no cookie", async () => {
    const response = await POST(signIn("nope", "198.51.100.3"));
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("unauthorized");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("answers 400 for a missing or oversized password", async () => {
    expect((await POST(signIn("", "198.51.100.4"))).status).toBe(400);
    expect((await POST(signIn("x".repeat(201), "198.51.100.4"))).status).toBe(400);
  });

  it("answers 429 from the 11th attempt in 15 minutes, per address", async () => {
    for (let attempt = 1; attempt <= 10; attempt++) {
      expect((await POST(signIn("wrong", "198.51.100.5"))).status).toBe(401);
    }
    const blocked = await POST(signIn("open sesame", "198.51.100.5"));
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error.code).toBe("rate_limited");
    expect((await POST(signIn("open sesame", "198.51.100.6"))).status).toBe(204);
  });

  it("answers 500 config_error when access is not set up", async () => {
    stubEnv();
    const response = await POST(signIn("anything", "198.51.100.7"));
    expect(response.status).toBe(500);
    expect((await response.json()).error.code).toBe("config_error");
  });
});

describe("DELETE /api/demo/session", () => {
  it("clears the cookie", async () => {
    const response = await DELETE();
    expect(response.status).toBe(204);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${DEMO_COOKIE_NAME}=;`);
    expect(cookie).toMatch(/Max-Age=0/i);
  });
});

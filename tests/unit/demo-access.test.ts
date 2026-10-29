import { describe, expect, it } from "vitest";
import { resolveDemoAccess } from "@/lib/demo-access/config";
import { DEMO_SESSION_SECONDS, demoCookieOptions } from "@/lib/demo-access/constants";
import { safeNextPath } from "@/lib/demo-access/next-path";
import { passwordMatches } from "@/lib/demo-access/password";
import { createSessionToken, verifySessionToken } from "@/lib/demo-access/session";

const secret = "a".repeat(32);
const now = new Date("2026-10-29T10:00:00Z");

function inDays(days: number): Date {
  return new Date(now.getTime() + days * 86_400_000);
}

describe("session token", () => {
  it("accepts a token it just made", async () => {
    const token = await createSessionToken(secret, now);
    expect(token).toMatch(/^\d+\.[A-Za-z0-9_-]+$/);
    expect(await verifySessionToken(token, secret, now)).toBe(true);
  });

  it("is valid for 7 days and not after", async () => {
    const token = await createSessionToken(secret, now);
    expect(Number(token.split(".")[0])).toBe(now.getTime() / 1000 + DEMO_SESSION_SECONDS);
    expect(await verifySessionToken(token, secret, inDays(6.9))).toBe(true);
    expect(await verifySessionToken(token, secret, inDays(7))).toBe(false);
    expect(await verifySessionToken(token, secret, inDays(30))).toBe(false);
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken("b".repeat(32), now);
    expect(await verifySessionToken(token, secret, now)).toBe(false);
  });

  it("rejects a changed expiry or signature", async () => {
    const [expiresAt, signature] = (await createSessionToken(secret, now)).split(".");
    const later = String(Number(expiresAt) + 86_400);
    const flipped = `${signature.slice(0, -2)}${signature.endsWith("AA") ? "BB" : "AA"}`;
    expect(await verifySessionToken(`${later}.${signature}`, secret, now)).toBe(false);
    expect(await verifySessionToken(`${expiresAt}.${flipped}`, secret, now)).toBe(false);
  });

  it.each(["", "abc", "123", "123.", ".abc", "1.2.3", "99999999999.***", "x.AAAA"])(
    "rejects the malformed token %j",
    async (token) => {
      expect(await verifySessionToken(token, secret, now)).toBe(false);
    },
  );
});

describe("passwordMatches", () => {
  it("matches only the same password", async () => {
    expect(await passwordMatches("open sesame", "open sesame")).toBe(true);
    expect(await passwordMatches("open sesame ", "open sesame")).toBe(false);
    expect(await passwordMatches("", "open sesame")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it.each(["/settings", "/invoices/new", "/export?month=2026-10"])("keeps %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    "//evil.example",
    "https://evil.example",
    "/\\evil.example",
    "evil.example",
    "javascript:alert(1)",
    "/ok\nHeader: x",
    "",
    null,
    undefined,
  ])("falls back for %j", (value) => {
    expect(safeNextPath(value)).toBe("/receivables");
  });
});

describe("demoCookieOptions", () => {
  it("is secure only in production", () => {
    expect(demoCookieOptions("production")).toEqual({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 604_800,
      secure: true,
    });
    expect(demoCookieOptions("development").secure).toBe(false);
  });
});

describe("resolveDemoAccess", () => {
  it("leaves access open without a password outside production", () => {
    expect(
      resolveDemoAccess({ password: undefined, secret: undefined, production: false }),
    ).toEqual({ kind: "open" });
  });

  it("asks for a password when one is set", () => {
    expect(resolveDemoAccess({ password: "pw", secret, production: false })).toEqual({
      kind: "required",
      password: "pw",
      secret,
    });
  });

  it("names what is missing, never a value", () => {
    expect(resolveDemoAccess({ password: undefined, secret, production: true })).toEqual({
      kind: "misconfigured",
      message: "Missing or invalid settings: DEMO_PASSWORD.",
    });
    expect(resolveDemoAccess({ password: "pw", secret: undefined, production: false })).toEqual({
      kind: "misconfigured",
      message: "Missing or invalid settings: SESSION_SECRET.",
    });
    expect(resolveDemoAccess({ password: undefined, secret: undefined, production: true })).toEqual(
      {
        kind: "misconfigured",
        message: "Missing or invalid settings: DEMO_PASSWORD, SESSION_SECRET.",
      },
    );
  });
});

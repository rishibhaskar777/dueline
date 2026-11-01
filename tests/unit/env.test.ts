import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConfigError,
  getEnv,
  isOffline,
  OFFLINE_BUYER_EMAIL,
  OFFLINE_DEMO_PASSWORD,
  offlineRefusal,
  resetEnvCache,
} from "@/lib/env";
import { stubEnv } from "../support/env";

function messageOf(read: () => unknown): string {
  try {
    read();
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigError);
    return (error as ConfigError).message;
  }
  throw new Error("Expected getEnv to throw");
}

describe("getEnv", () => {
  beforeEach(() => stubEnv());

  it("reads the sandbox settings and applies defaults", () => {
    const env = getEnv();
    expect(env.PAYPAL_CLIENT_ID).toBe("test-client");
    expect(env.DEMO_MODE).toBe(true);
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it("parses and caches a frozen result", () => {
    expect(getEnv()).toBe(getEnv());
    expect(Object.isFrozen(getEnv())).toBe(true);
  });

  it("parses DEMO_MODE", () => {
    stubEnv({ DEMO_MODE: "false" });
    expect(getEnv().DEMO_MODE).toBe(false);
    stubEnv({ DEMO_MODE: "yes" });
    expect(messageOf(getEnv)).toContain("DEMO_MODE");
  });

  it("names missing variables without showing values", () => {
    stubEnv({ PAYPAL_CLIENT_ID: "", PAYPAL_CLIENT_SECRET: "", DATABASE_URL: "not-a-url-value" });
    const message = messageOf(getEnv);
    expect(message).toBe(
      "Missing or invalid settings: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, DATABASE_URL.",
    );
    expect(message).not.toContain("not-a-url-value");
  });

  it("refuses any PayPal environment except the sandbox", () => {
    stubEnv({ PAYPAL_ENVIRONMENT: "live" });
    expect(messageOf(getEnv)).toBe("Dueline only runs against the PayPal sandbox.");
  });

  it("reads the demo password and a session secret of at least 32 characters", () => {
    stubEnv({ DEMO_PASSWORD: "open sesame", SESSION_SECRET: "s".repeat(32) });
    expect(getEnv().DEMO_PASSWORD).toBe("open sesame");
    expect(getEnv().SESSION_SECRET).toBe("s".repeat(32));
    stubEnv({ SESSION_SECRET: "too-short" });
    const message = messageOf(getEnv);
    expect(message).toBe("Missing or invalid settings: SESSION_SECRET.");
  });

  it("accepts only sandbox buyer addresses", () => {
    stubEnv({ SANDBOX_BUYER_EMAIL: "buyer@personal.example.com" });
    expect(getEnv().SANDBOX_BUYER_EMAIL).toBe("buyer@personal.example.com");
    stubEnv({ SANDBOX_BUYER_EMAIL: "someone@gmail.com" });
    const message = messageOf(getEnv);
    expect(message).toContain("SANDBOX_BUYER_EMAIL");
    expect(message).not.toContain("gmail");
  });

  it("rejects a malformed DEMO_TODAY", () => {
    stubEnv({ DEMO_TODAY: "17/10/2026" });
    expect(messageOf(getEnv)).toContain("DEMO_TODAY");
  });
});

describe("offline mode", () => {
  beforeEach(() => {
    stubEnv({ DUELINE_OFFLINE: "true", PAYPAL_CLIENT_ID: "", PAYPAL_CLIENT_SECRET: "" });
    vi.stubEnv("PAYPAL_ENVIRONMENT", "");
    // The suite may itself run in CI or on a host that sets these.
    vi.stubEnv("CI", "");
    vi.stubEnv("VERCEL", "");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("needs no PayPal or Gemini settings and says it is offline", () => {
    expect(getEnv().DUELINE_OFFLINE).toBe(true);
    expect(isOffline()).toBe(true);
    expect(getEnv().PAYPAL_ENVIRONMENT).toBe("sandbox");
  });

  it("is off unless asked for", () => {
    stubEnv();
    expect(isOffline()).toBe(false);
  });

  it("defaults the demo password, the session secret and the buyer", () => {
    const env = getEnv();
    expect(env.DEMO_PASSWORD).toBe(OFFLINE_DEMO_PASSWORD);
    expect(env.SESSION_SECRET?.length).toBeGreaterThanOrEqual(32);
    expect(env.SANDBOX_BUYER_EMAIL).toBe(OFFLINE_BUYER_EMAIL);
    expect(env.DEMO_MODE).toBe(true);
  });

  it("keeps a demo password that was set", () => {
    stubEnv({ DUELINE_OFFLINE: "true", DEMO_PASSWORD: "my own" });
    expect(getEnv().DEMO_PASSWORD).toBe("my own");
  });

  it("ignores a database, an AI key and PayPal accounts in the environment", () => {
    stubEnv({
      DUELINE_OFFLINE: "true",
      DATABASE_URL: "postgres://user:pass@db.example.com/dueline",
      GEMINI_API_KEY: "key",
      DEMO_MODE: "false",
    });
    const env = getEnv();
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.GEMINI_API_KEY).toBeUndefined();
    expect(env.DEMO_MODE).toBe(true);
    expect(env.PAYPAL_CLIENT_ID).toBe("offline");
  });

  it("still checks the settings it does read", () => {
    stubEnv({ DUELINE_OFFLINE: "true", DEMO_TODAY: "17/10/2026" });
    expect(messageOf(getEnv)).toContain("DEMO_TODAY");
    stubEnv({ DUELINE_OFFLINE: "maybe" });
    expect(messageOf(getEnv)).toBe("Missing or invalid settings: DUELINE_OFFLINE.");
  });

  it("is refused in production unless CI is true", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(messageOf(getEnv)).toContain("only in development and in CI");
    vi.stubEnv("CI", "true");
    resetEnvCache();
    expect(getEnv().DUELINE_OFFLINE).toBe(true);
  });

  it("is never allowed on Vercel, even in CI", () => {
    vi.stubEnv("CI", "true");
    vi.stubEnv("VERCEL", "1");
    expect(messageOf(getEnv)).toContain("cannot run on Vercel");
  });
});

describe("offlineRefusal", () => {
  it("allows development, tests and CI builds", () => {
    expect(offlineRefusal({ NODE_ENV: "development" })).toBeNull();
    expect(offlineRefusal({ NODE_ENV: "test" })).toBeNull();
    expect(offlineRefusal({ NODE_ENV: "production", CI: "true" })).toBeNull();
  });

  it("refuses a production run outside CI and anything on Vercel", () => {
    expect(offlineRefusal({ NODE_ENV: "production" })).not.toBeNull();
    expect(offlineRefusal({ NODE_ENV: "production", CI: "1" })).not.toBeNull();
    expect(offlineRefusal({ NODE_ENV: "development", VERCEL: "1" })).not.toBeNull();
  });
});

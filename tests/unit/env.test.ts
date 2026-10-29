import { beforeEach, describe, expect, it } from "vitest";
import { ConfigError, getEnv } from "@/lib/env";
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

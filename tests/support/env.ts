import { vi } from "vitest";
import { resetEnvCache } from "@/lib/env";

const VARIABLES = [
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "PAYPAL_ENVIRONMENT",
  "PAYPAL_WEBHOOK_ID",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "GEMINI_FALLBACK_MODEL",
  "DATABASE_URL",
  "DEMO_MODE",
  "DEMO_TODAY",
  "DEMO_PASSWORD",
  "SANDBOX_BUYER_EMAIL",
];

export function stubEnv(values: Record<string, string> = {}): void {
  vi.unstubAllEnvs();
  VARIABLES.forEach((name) => vi.stubEnv(name, ""));
  const defaults = {
    PAYPAL_CLIENT_ID: "test-client",
    PAYPAL_CLIENT_SECRET: "test-secret",
    PAYPAL_ENVIRONMENT: "sandbox",
  };
  Object.entries({ ...defaults, ...values }).forEach(([name, value]) => vi.stubEnv(name, value));
  resetEnvCache();
}

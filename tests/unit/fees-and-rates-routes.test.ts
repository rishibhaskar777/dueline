import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as estimate } from "@/app/api/payout-estimate/route";
import { GET as getSettings, PUT as putSettings } from "@/app/api/settings/route";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { DEFAULT_SETTINGS, type Settings } from "@/types";
import { stubEnv } from "../support/env";
import { ECB_RATES, ecbResponse } from "../support/rates";

const holder = vi.hoisted(() => ({ store: undefined as Store | undefined }));
vi.mock("@/lib/store", () => ({ getStore: () => holder.store }));

const origin = "http://localhost:3000";

function json(method: string, path: string, body: unknown): Request {
  return new Request(`${origin}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const manual: Settings = {
  ...DEFAULT_SETTINGS,
  rateSource: "manual",
  marketRates: { USD: 88, EUR: 100, GBP: 120, CAD: 65, AUD: 58 },
  ratesUpdatedOn: "2026-10-01",
};

beforeEach(() => {
  stubEnv({ DEMO_TODAY: "2026-10-29" });
  holder.store = createMemoryStore();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => ecbResponse());
});

afterEach(() => vi.restoreAllMocks());

describe("/api/settings", () => {
  it("returns the defaults with the ECB rates before anything is saved", async () => {
    const response = await getSettings();
    expect(await response.json()).toEqual({
      ...DEFAULT_SETTINGS,
      marketRates: ECB_RATES,
      ratesUpdatedOn: "2026-10-28",
    });
  });

  it("returns what was saved", async () => {
    const saved = await putSettings(json("PUT", "/api/settings", manual));
    expect(saved.status).toBe(200);
    // Rates that differ from the stored ones are dated today.
    const dated = { ...manual, ratesUpdatedOn: "2026-10-29" };
    expect(await saved.json()).toEqual(dated);
    expect(await (await getSettings()).json()).toEqual(dated);
  });

  it("refuses a fee outside the allowed range and names the field", async () => {
    const response = await putSettings(json("PUT", "/api/settings", { ...manual, feePercent: 12 }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_request");
    expect(body.error.message).toContain("feePercent");
  });

  it("refuses the old shape with a single fixed fee", async () => {
    const old = { ...manual, fixedFees: undefined, fixedFee: "0.30" };
    const response = await putSettings(json("PUT", "/api/settings", old));
    expect(response.status).toBe(400);
  });
});

describe("POST /api/payout-estimate", () => {
  const amount = { currency: "USD", value: "100.00" };

  it("estimates with the ECB rate of the day", async () => {
    const response = await estimate(json("POST", "/api/payout-estimate", { amount }));
    expect(await response.json()).toMatchObject({
      fee: { currency: "USD", value: "4.70" },
      net: { currency: "USD", value: "95.30" },
      marketRate: 85,
      conversionRate: 82.45,
      marketRateDate: "2026-10-28",
      marketRateSource: "ecb",
      netInr: 7857,
    });
  });

  it("estimates with the saved rates when the source is manual", async () => {
    await putSettings(json("PUT", "/api/settings", manual));
    const response = await estimate(json("POST", "/api/payout-estimate", { amount }));
    expect(await response.json()).toMatchObject({
      marketRate: 88,
      marketRateDate: "2026-10-29",
      marketRateSource: "manual",
      netInr: 8135,
      lossInr: 665,
    });
  });

  it("refuses an amount that is not positive", async () => {
    const response = await estimate(
      json("POST", "/api/payout-estimate", { amount: { currency: "USD", value: "0.00" } }),
    );
    expect(response.status).toBe(400);
  });
});

describe("unexpected errors", () => {
  it("answer 500 internal_error without exposing the cause", async () => {
    holder.store = {
      ...createMemoryStore(),
      getSettings: async () => {
        throw new Error("connection to 10.0.0.5 refused");
      },
    };
    const response = await getSettings();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "internal_error",
        message: "Something went wrong on our side. Try again in a moment.",
      },
    });
  });
});

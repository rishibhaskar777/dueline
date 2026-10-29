import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMarketRates } from "@/lib/rates/rates";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { DEFAULT_SETTINGS, type Settings } from "@/types";
import { stubEnv } from "../support/env";
import { jsonResponse } from "../support/http";
import { ECB_RATES, ecbResponse } from "../support/rates";

const holder = vi.hoisted(() => ({ store: undefined as Store | undefined }));
vi.mock("@/lib/store", () => ({ getStore: () => holder.store }));

const ecbSettings: Settings = DEFAULT_SETTINGS;
const manualSettings: Settings = {
  ...DEFAULT_SETTINGS,
  rateSource: "manual",
  marketRates: { USD: 90, EUR: 100, GBP: 120, CAD: 65, AUD: 58 },
  ratesUpdatedOn: "2026-10-01",
};
const stored = { rates: { USD: 80, EUR: 90, GBP: 100, CAD: 60, AUD: 50 }, onDate: "2026-10-27" };

beforeEach(() => {
  stubEnv({ DEMO_TODAY: "2026-10-29" });
  holder.store = createMemoryStore();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("getMarketRates", () => {
  it("uses the saved rates without any network call when the source is manual", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    expect(await getMarketRates(manualSettings)).toEqual({
      rates: manualSettings.marketRates,
      onDate: "2026-10-01",
      source: "manual",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches once, stores the rates and keeps the ECB date", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ecbResponse());
    const first = await getMarketRates(ecbSettings);
    const second = await getMarketRates(ecbSettings);

    expect(first).toEqual({ rates: ECB_RATES, onDate: "2026-10-28", source: "ecb" });
    expect(second).toEqual(first);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await holder.store?.getLatestRates()).toEqual({
      rates: ECB_RATES,
      onDate: "2026-10-28",
      fetchedOn: "2026-10-29",
    });
  });

  it("does not fetch when rates were already fetched today", async () => {
    await holder.store?.putRates({ ...stored, fetchedOn: "2026-10-29" });
    const fetch = vi.spyOn(globalThis, "fetch");
    expect(await getMarketRates(ecbSettings)).toEqual({ ...stored, source: "ecb" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches again when the stored rates were fetched on an earlier day", async () => {
    await holder.store?.putRates({ ...stored, fetchedOn: "2026-10-28" });
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ecbResponse());
    expect((await getMarketRates(ecbSettings)).rates).toEqual(ECB_RATES);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("shares one fetch between callers that arrive together", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ecbResponse());
    const results = await Promise.all([
      getMarketRates(ecbSettings),
      getMarketRates(ecbSettings),
      getMarketRates(ecbSettings),
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(results.every((result) => result.rates.USD === 85)).toBe(true);
  });

  it("uses the latest stored rates when the fetch fails", async () => {
    await holder.store?.putRates({ ...stored, fetchedOn: "2026-10-28" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, { status: 500 }));
    expect(await getMarketRates(ecbSettings)).toEqual({ ...stored, source: "ecb" });
  });

  it("uses the saved rates as a last resort and never throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    expect(await getMarketRates({ ...manualSettings, rateSource: "ecb" })).toEqual({
      rates: manualSettings.marketRates,
      onDate: "2026-10-01",
      source: "manual",
    });
  });

  it("still returns fetched rates when storing them fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => ecbResponse());
    holder.store = {
      ...createMemoryStore(),
      putRates: async () => {
        throw new Error("database down");
      },
    };
    expect((await getMarketRates(ecbSettings)).rates).toEqual(ECB_RATES);
  });
});

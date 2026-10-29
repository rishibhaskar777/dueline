import { beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { getSettings, saveSettings } from "@/lib/settings";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { DEFAULT_SETTINGS, type Settings } from "@/types";
import { stubEnv } from "../support/env";
import { ECB_RATES, ecbResponse } from "../support/rates";

const holder = vi.hoisted(() => ({ store: undefined as Store | undefined }));
vi.mock("@/lib/store", () => ({ getStore: () => holder.store }));

const manual: Settings = {
  ...DEFAULT_SETTINGS,
  rateSource: "manual",
  marketRates: { USD: 90, EUR: 100, GBP: 120, CAD: 65, AUD: 58 },
  ratesUpdatedOn: "2026-10-01",
};

let fetchSpy: MockInstance<typeof fetch>;

beforeEach(() => {
  stubEnv({ DEMO_TODAY: "2026-10-29" });
  holder.store = createMemoryStore();
  vi.restoreAllMocks();
  fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ecbResponse());
});

describe("getSettings", () => {
  it("returns the defaults with the ECB rates when nothing is saved", async () => {
    expect(await getSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      marketRates: ECB_RATES,
      ratesUpdatedOn: "2026-10-28",
    });
  });

  it("fills a row saved by an older version with the defaults", async () => {
    const old = { feePercent: 5, fixedFee: "0.30", fxMarkupPercent: 3.5, rateSource: "manual" };
    await holder.store?.saveSettings(old as unknown as Settings);
    expect(await getSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      feePercent: 5,
      fxMarkupPercent: 3.5,
      rateSource: "manual",
    });
  });

  it("falls back to the defaults for a row that cannot be read", async () => {
    await holder.store?.saveSettings({ feePercent: "lots" } as unknown as Settings);
    expect((await getSettings()).feePercent).toBe(4.4);
  });

  it("returns the saved rates as they are when the source is manual", async () => {
    await holder.store?.saveSettings(manual);
    expect(await getSettings()).toEqual(manual);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("saveSettings", () => {
  it("keeps what was saved", async () => {
    const saved = await saveSettings({ ...manual, feePercent: 5 });
    expect(saved.feePercent).toBe(5);
    expect((await getSettings()).feePercent).toBe(5);
  });

  it("dates changed manual rates today", async () => {
    await holder.store?.saveSettings(manual);
    const rates = { ...manual.marketRates, USD: 91 };
    expect((await saveSettings({ ...manual, marketRates: rates })).ratesUpdatedOn).toBe(
      "2026-10-29",
    );
  });

  it("keeps the date of manual rates that did not change", async () => {
    await holder.store?.saveSettings(manual);
    expect((await saveSettings(manual)).ratesUpdatedOn).toBe("2026-10-01");
  });

  it.each<[string, Partial<Settings>]>([
    ["a fee above 10%", { feePercent: 10.5 }],
    ["a negative fee", { feePercent: -1 }],
    ["a markup above 10%", { fxMarkupPercent: 11 }],
    ["a fixed fee above 5.00", { fixedFees: { ...DEFAULT_SETTINGS.fixedFees, USD: "5.01" } }],
    ["a fixed fee with 3 decimals", { fixedFees: { ...DEFAULT_SETTINGS.fixedFees, EUR: "0.355" } }],
    ["a rate of zero", { marketRates: { ...DEFAULT_SETTINGS.marketRates, GBP: 0 } }],
    ["a rate of 1000", { marketRates: { ...DEFAULT_SETTINGS.marketRates, CAD: 1000 } }],
  ])("rejects %s", async (_name, changes) => {
    await expect(saveSettings({ ...manual, ...changes })).rejects.toThrow();
    expect(await holder.store?.getSettings()).toBeNull();
  });
});

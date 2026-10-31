import { describe, expect, it } from "vitest";
import { convertToInr, convertToPaise, estimatePayout, paypalRateFor } from "@/lib/money/payout";
import { DEFAULT_SETTINGS, type CurrencyCode, type MarketRate, type Settings } from "@/types";

const rate = (value: number): MarketRate => ({ value, onDate: "2026-10-28", source: "ecb" });
const usd = (value: string) => ({ currency: "USD" as const, value });

describe("estimatePayout", () => {
  it("works out 100.00 USD at the default fees", () => {
    expect(estimatePayout(usd("100.00"), DEFAULT_SETTINGS, rate(88))).toEqual({
      gross: usd("100.00"),
      fee: usd("4.70"),
      net: usd("95.30"),
      conversionRate: 85.36,
      marketRate: 88,
      marketRateDate: "2026-10-28",
      marketRateSource: "ecb",
      netInr: 8135,
      lossInr: 665,
      lossPercent: 7.6,
    });
  });

  it("converts PayPal's own net at the same rate", () => {
    expect(convertToInr(usd("95.04"), 85.36)).toBe(8113);
    expect(convertToPaise(usd("95.04"), 85.36)).toBe(811_261);
  });

  it.each<[CurrencyCode, string]>([
    ["USD", "4.70"],
    ["EUR", "4.75"],
    ["GBP", "4.60"],
    ["CAD", "4.70"],
    ["AUD", "4.70"],
  ])("adds the fixed fee for %s", (currency, fee) => {
    const estimate = estimatePayout({ currency, value: "100.00" }, DEFAULT_SETTINGS, rate(80));
    expect(estimate.fee).toEqual({ currency, value: fee });
  });

  it("never reports a negative amount after the fee", () => {
    const tiny = estimatePayout(usd("0.10"), DEFAULT_SETTINGS, rate(88));
    expect(tiny.net.value).toBe("0.00");
    expect(tiny.netInr).toBe(0);
    expect(tiny.lossInr).toBe(9);

    const zero = estimatePayout(usd("0.00"), DEFAULT_SETTINGS, rate(88));
    expect(zero).toMatchObject({ net: usd("0.00"), netInr: 0, lossInr: 0, lossPercent: 0 });
  });

  it("converts at the market rate when the markup is zero", () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, fxMarkupPercent: 0 };
    const estimate = estimatePayout(usd("100.00"), settings, rate(88));
    expect(estimate.conversionRate).toBe(88);
    expect(estimate.netInr).toBe(8386);
    expect(estimate.lossInr).toBe(414);
  });

  it("rounds half a cent up in the fee", () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      fixedFees: { ...DEFAULT_SETTINGS.fixedFees, USD: "0.00" },
    };
    expect(estimatePayout(usd("1.25"), settings, rate(88)).fee).toEqual(usd("0.06"));
  });

  it("rounds half a rupee up", () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      feePercent: 0,
      fxMarkupPercent: 0,
      fixedFees: { ...DEFAULT_SETTINGS.fixedFees, USD: "0.00" },
    };
    expect(estimatePayout(usd("1.00"), settings, rate(50.5)).netInr).toBe(51);
  });

  it("rounds the market rate to four places", () => {
    const estimate = estimatePayout(usd("100.00"), DEFAULT_SETTINGS, rate(88.12345));
    expect(estimate.marketRate).toBe(88.1235);
    expect(estimate.conversionRate).toBe(85.4798);
  });

  it("keeps the rate source and date it was given", () => {
    const manual: MarketRate = { value: 88, onDate: "2026-10-01", source: "manual" };
    expect(estimatePayout(usd("100.00"), DEFAULT_SETTINGS, manual)).toMatchObject({
      marketRateDate: "2026-10-01",
      marketRateSource: "manual",
    });
  });
});

describe("paypalRateFor", () => {
  it("takes the markup off the market rate", () => {
    expect(paypalRateFor(88, 3)).toBe(85.36);
    expect(paypalRateFor(88, 0)).toBe(88);
  });
});

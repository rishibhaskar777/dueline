import { describe, expect, it } from "vitest";
import { OFFLINE_RATES_LABEL, rateSourceLabel } from "@/components/shared/rate-source";

describe("rateSourceLabel", () => {
  it("names the ECB and hand-set rates when online", () => {
    expect(rateSourceLabel("ecb", false)).toBe("European Central Bank rates");
    expect(rateSourceLabel("manual", false)).toBe("Rates you set by hand");
  });

  it("calls the rates saved rates offline, whatever the source says", () => {
    expect(rateSourceLabel("manual", true)).toBe("Saved rates (offline demo)");
    expect(rateSourceLabel("ecb", true)).toBe(OFFLINE_RATES_LABEL);
  });
});

import { describe, expect, it } from "vitest";
import { averageGap, costLines, lostLine } from "@/components/settings/payout-lines";
import { payoutEstimate } from "@/mocks/fixtures";

describe("lostLine", () => {
  it("says what fees and conversion took, in rupees and as a share", () => {
    expect(lostLine(payoutEstimate)).toBe("Lost to fees and conversion: ₹2,904 (7.3%)");
  });

  it("keeps one decimal on a round share", () => {
    expect(lostLine({ ...payoutEstimate, lossPercent: 7 })).toContain("(7.0%)");
  });
});

describe("costLines", () => {
  it("shows the fee, the conversion and a total that is their sum", () => {
    const lines = costLines(payoutEstimate);
    expect(lines.map((line) => line.label)).toEqual([
      "PayPal fee",
      "Currency conversion",
      "Total lost",
    ]);
    expect(lines[0].value).toBe("− $20.10 (about ₹1,769)");
    expect(lines[1].value).toBe("− ₹1,135");
    expect(lines[2].value).toBe("− ₹2,904 (7.3%)");
    expect(payoutEstimate.feeInr + payoutEstimate.conversionLossInr).toBe(payoutEstimate.lossInr);
  });
});

describe("averageGap", () => {
  it("names the side of the 30-day average", () => {
    expect(averageGap(0.6)).toBe("0.6% above");
    expect(averageGap(-0.8)).toBe("0.8% below");
  });

  it("handles a rate on its average and no average at all", () => {
    expect(averageGap(0)).toBe("Same as average");
    expect(averageGap(null)).toBe("–");
  });
});

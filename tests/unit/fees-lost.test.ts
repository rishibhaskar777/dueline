import { describe, expect, it } from "vitest";
import { feesLostFrom } from "@/lib/insights/fees-lost";
import type { AnnualSummary } from "@/types";

function annual(overrides: Partial<AnnualSummary>): AnnualSummary {
  return {
    fy: "2026-27",
    from: "2026-04-01",
    to: "2027-03-31",
    receivedPayPalInr: 0,
    receivedOutsideInr: 0,
    paypalFeesInr: 0,
    conversionLossInr: 0,
    grossReceiptsInr: 0,
    presumptiveIncomeInr: 0,
    presumptiveLimitInr: 7_500_000,
    overLimit: false,
    invoiceCount: 0,
    clientCount: 0,
    ...overrides,
  };
}

describe("feesLostFrom", () => {
  it("adds fees to the conversion loss and says how much is lost per 100 rupees", () => {
    expect(
      feesLostFrom(
        annual({ receivedPayPalInr: 90_000, paypalFeesInr: 4000, conversionLossInr: 6000 }),
      ),
    ).toEqual({
      financialYear: "2026-27",
      feesInr: 4000,
      conversionLossInr: 6000,
      lostInr: 10_000,
      receivedInr: 90_000,
      lostPer100: 10,
    });
  });

  it("rounds to one decimal", () => {
    const { lostPer100 } = feesLostFrom(
      annual({ receivedPayPalInr: 95_000, paypalFeesInr: 2000, conversionLossInr: 3_333 }),
    );
    expect(lostPer100).toBe(5.3);
  });

  it("ignores money received outside PayPal", () => {
    const fees = feesLostFrom(annual({ receivedOutsideInr: 50_000, receivedPayPalInr: 0 }));
    expect(fees).toMatchObject({ lostInr: 0, receivedInr: 0, lostPer100: 0 });
  });
});

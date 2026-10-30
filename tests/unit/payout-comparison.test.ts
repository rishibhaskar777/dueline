import { describe, expect, it } from "vitest";
import {
  describeFeeDifference,
  describeRupeeDifference,
} from "@/components/receivables/payout-comparison";

const usd = (value: string) => ({ currency: "USD" as const, value });

describe("payout comparison", () => {
  it("says how much more PayPal charged", () => {
    expect(describeFeeDifference(usd("19.84"), usd("20.10"))).toBe(
      "PayPal charged $0.26 more than the published fee.",
    );
  });

  it("says how much less PayPal charged", () => {
    expect(describeFeeDifference(usd("20.10"), usd("19.84"))).toBe(
      "PayPal charged $0.26 less than the published fee.",
    );
  });

  it("says when the fee matches", () => {
    expect(describeFeeDifference(usd("20.10"), usd("20.10"))).toBe(
      "PayPal charged exactly the published fee.",
    );
  });

  it("compares rupees", () => {
    expect(describeRupeeDifference(36696, 35617)).toBe("You received ₹1,079 less than estimated.");
    expect(describeRupeeDifference(35000, 35100)).toBe("You received ₹100 more than estimated.");
    expect(describeRupeeDifference(35000, 35000)).toBe("The rupees match the estimate.");
  });
});

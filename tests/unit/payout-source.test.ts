import { describe, expect, it } from "vitest";
import { payoutSourceHint, payoutSourceWord } from "@/components/shared/payout-source";
import { payoutSourceNote } from "@/components/receivables/invoice-status";

describe("payoutSourceWord", () => {
  it("is the short word the table shows beside the rupees", () => {
    expect(payoutSourceWord("estimate")).toBe("est.");
    expect(payoutSourceWord("paypal")).toBe("PayPal");
    expect(payoutSourceWord("outside_paypal")).toBe("bank");
  });

  it("says the fee is PayPal's and only the rate is estimated when PayPal reported the fee", () => {
    expect(payoutSourceWord("estimate", true)).toBe("PayPal fee · est. rate");
  });

  it("keeps est. when the fee is an estimate too, and leaves the other sources alone", () => {
    expect(payoutSourceWord("estimate", false)).toBe("est.");
    expect(payoutSourceWord("paypal", true)).toBe("PayPal");
    expect(payoutSourceWord("outside_paypal", true)).toBe("bank");
  });
});

describe("payoutSourceHint", () => {
  it("explains the mixed case with the date of the rate", () => {
    expect(payoutSourceHint("estimate", true, "2026-10-30")).toBe(
      "Fee and net from PayPal; rupees at the ECB rate of 30 Oct 2026 less your markup",
    );
    expect(payoutSourceHint("estimate", true, null)).toContain("the ECB rate less your markup");
  });

  it("has nothing to add for the other cases", () => {
    expect(payoutSourceHint("estimate", false, "2026-10-30")).toBeUndefined();
    expect(payoutSourceHint("paypal", true, null)).toBeUndefined();
    expect(payoutSourceHint("outside_paypal", false, null)).toBeUndefined();
  });
});

describe("payoutSourceNote", () => {
  it("names the mixed case in the due line tooltip", () => {
    expect(payoutSourceNote("estimate", true)).toBe("PayPal fee, estimated rate");
    expect(payoutSourceNote("estimate")).toBe("estimate");
  });
});

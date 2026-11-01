import { describe, expect, it } from "vitest";
import { describeRupees, fallbackNote } from "@/components/export/register-text";
import { exportRegister } from "@/mocks/fixtures";

function register(paypalInr: number, estimatedInr: number, bankInr: number) {
  return {
    ...exportRegister,
    paypalInr,
    estimatedInr,
    bankInr,
    paypalFiraInr: paypalInr + estimatedInr,
    totalInr: paypalInr + estimatedInr + bankInr,
  };
}

describe("describeRupees", () => {
  it("says from PayPal and estimated when both are there", () => {
    expect(describeRupees(register(58441, 22824, 0))).toBe(
      "₹58,441 from PayPal, ₹22,824 estimated",
    );
  });

  it("counts a bank transfer as estimated", () => {
    expect(describeRupees(register(35617, 0, 50000))).toBe(
      "₹35,617 from PayPal, ₹50,000 estimated",
    );
  });

  it("says all estimated when PayPal reported nothing", () => {
    expect(describeRupees(register(0, 87832, 0))).toBe("All estimated");
    expect(describeRupees(register(0, 0, 50000))).toBe("All estimated");
  });

  it("says all from PayPal when nothing is estimated", () => {
    expect(describeRupees(register(35617, 0, 0))).toBe("All from PayPal");
  });

  it("does not repeat the total in the note", () => {
    const note = describeRupees(register(0, 87832, 0));
    expect(note).not.toContain("87,832");
  });

  it("reports nothing when there are no rupees", () => {
    expect(describeRupees(register(0, 0, 0))).toBe("No rupees to report");
  });
});

describe("fallbackNote", () => {
  it("names the empty month and the one shown", () => {
    expect(fallbackNote("2026-11", "2026-10")).toBe(
      "No payments in November yet. Showing October, the latest month with payments.",
    );
  });

  it("adds the year when the latest month is in an earlier year", () => {
    expect(fallbackNote("2026-01", "2025-12")).toBe(
      "No payments in January yet. Showing December 2025, the latest month with payments.",
    );
  });
});

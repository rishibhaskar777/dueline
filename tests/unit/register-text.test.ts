import { describe, expect, it } from "vitest";
import { describeRupeeSplit } from "@/components/export/register-text";
import { exportRegister } from "@/mocks/fixtures";

describe("describeRupeeSplit", () => {
  it("names both parts when both are there", () => {
    expect(describeRupeeSplit({ ...exportRegister, paypalInr: 35617, estimatedInr: 22824 })).toBe(
      "PayPal figures ₹35,617 · estimated ₹22,824",
    );
  });

  it("leaves out a part that is zero", () => {
    expect(describeRupeeSplit({ ...exportRegister, paypalInr: 0, estimatedInr: 22824 })).toBe(
      "estimated ₹22,824",
    );
    expect(describeRupeeSplit({ ...exportRegister, paypalInr: 35617, estimatedInr: 0 })).toBe(
      "PayPal figures ₹35,617",
    );
  });

  it("does not report a figure when there is nothing", () => {
    expect(describeRupeeSplit({ ...exportRegister, paypalInr: 0, estimatedInr: 0 })).toBe(
      "No rupees to report",
    );
  });
});

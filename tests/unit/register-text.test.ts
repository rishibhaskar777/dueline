import { describe, expect, it } from "vitest";
import { describeRupeeSplit } from "@/components/export/register-text";
import { exportRegister } from "@/mocks/fixtures";

describe("describeRupeeSplit", () => {
  it("names both parts when both are there", () => {
    expect(
      describeRupeeSplit({
        ...exportRegister,
        paypalFiraInr: 58441,
        estimatedInr: 22824,
        bankInr: 50000,
      }),
    ).toBe("PayPal FIRA ₹58,441 · of which estimated ₹22,824 · bank transfers ₹50,000");
  });

  it("leaves out a part that is zero", () => {
    expect(
      describeRupeeSplit({ ...exportRegister, paypalFiraInr: 0, estimatedInr: 0, bankInr: 50000 }),
    ).toBe("bank transfers ₹50,000");
    expect(
      describeRupeeSplit({ ...exportRegister, paypalFiraInr: 35617, estimatedInr: 0, bankInr: 0 }),
    ).toBe("PayPal FIRA ₹35,617");
  });

  it("does not report a figure when there is nothing", () => {
    expect(
      describeRupeeSplit({ ...exportRegister, paypalFiraInr: 0, estimatedInr: 0, bankInr: 0 }),
    ).toBe("No rupees to report");
  });
});

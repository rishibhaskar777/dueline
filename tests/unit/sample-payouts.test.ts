import { describe, expect, it } from "vitest";
import {
  HOW_IT_WORKS_PAYOUT,
  LANDING_PAYOUT,
  SAMPLE_INVOICE_TOTAL,
  SAMPLE_ITEMS,
  sampleItemTotal,
} from "@/components/site/sample-payouts";

describe("How it works figures", () => {
  it("draft the same invoice that step 2 totals", () => {
    expect(SAMPLE_ITEMS.map(sampleItemTotal)).toEqual(["360.00", "250.00"]);
    expect(SAMPLE_INVOICE_TOTAL).toBe("610.00");
    expect(HOW_IT_WORKS_PAYOUT.estimate.gross).toEqual({ currency: "EUR", value: "610.00" });
  });

  it("add up: fee and conversion make the total lost, which is what the bank figure is short by", () => {
    const { estimate } = HOW_IT_WORKS_PAYOUT;
    expect(estimate.feeInr + estimate.conversionLossInr).toBe(estimate.lossInr);
    expect(HOW_IT_WORKS_PAYOUT).toMatchObject({
      fee: "− €27.19",
      conversion: "− ₹1,862",
      total: "− ₹4,756",
      bank: "₹60,179",
    });
  });
});

describe("landing payout card", () => {
  it("shows the $900 payment and its three lines adding up", () => {
    const { estimate } = LANDING_PAYOUT;
    expect(LANDING_PAYOUT).toMatchObject({
      gross: "$900.00",
      fee: "− $39.90",
      conversion: "− ₹2,450",
      total: "− ₹6,239",
      bank: "₹79,221",
    });
    expect(estimate.feeInr + estimate.conversionLossInr).toBe(estimate.lossInr);
  });
});

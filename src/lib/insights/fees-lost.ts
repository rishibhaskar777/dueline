import type { AnnualSummary, FeesLost } from "@/types";

// Only payments that went through PayPal can lose anything: the annual summary already counts a
// payment recorded outside PayPal as paying no fee and suffering no conversion loss.
export function feesLostFrom(summary: AnnualSummary): FeesLost {
  const lostInr = summary.paypalFeesInr + summary.conversionLossInr;
  const paidInr = summary.receivedPayPalInr + lostInr;
  return {
    financialYear: summary.fy,
    feesInr: summary.paypalFeesInr,
    conversionLossInr: summary.conversionLossInr,
    lostInr,
    receivedInr: summary.receivedPayPalInr,
    lostPer100: paidInr === 0 ? 0 : Math.round((lostInr / paidInr) * 1000) / 10,
  };
}

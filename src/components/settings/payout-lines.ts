import { formatMoney, formatRupees } from "@/lib/money/format";
import type { PayoutEstimate } from "@/types";

export interface CostLine {
  label: string;
  value: string;
}

// The three lines under an invoice total: the fee, what the markup took, and both added up.
export function costLines(estimate: PayoutEstimate): CostLine[] {
  return [
    {
      label: "PayPal fee",
      value: `− ${formatMoney(estimate.fee)} (about ${formatRupees(estimate.feeInr)})`,
    },
    { label: "Currency conversion", value: `− ${formatRupees(estimate.conversionLossInr)}` },
    {
      label: "Total lost",
      value: `− ${formatRupees(estimate.lossInr)} (${estimate.lossPercent.toFixed(1)}%)`,
    },
  ];
}

export function lostLine({ lossInr, lossPercent }: PayoutEstimate): string {
  return `Lost to fees and conversion: ${formatRupees(lossInr)} (${lossPercent.toFixed(1)}%)`;
}

// How a currency's rate sits against its 30-day average, for the rates table.
export function averageGap(percent: number | null): string {
  if (percent === null) return "–";
  if (percent === 0) return "Same as average";
  return `${Math.abs(percent).toFixed(1)}% ${percent > 0 ? "above" : "below"}`;
}

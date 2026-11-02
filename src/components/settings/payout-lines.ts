import { formatRupees } from "@/lib/money/format";
import type { PayoutEstimate } from "@/types";

export function lostLine({ lossInr, lossPercent }: PayoutEstimate): string {
  return `Lost to fees and conversion: ${formatRupees(lossInr)} (${lossPercent.toFixed(1)}%)`;
}

// How a currency's rate sits against its 30-day average, for the rates table.
export function averageGap(percent: number | null): string {
  if (percent === null) return "–";
  if (percent === 0) return "Same as average";
  return `${Math.abs(percent).toFixed(1)}% ${percent > 0 ? "above" : "below"}`;
}

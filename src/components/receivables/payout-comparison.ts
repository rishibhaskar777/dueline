import { formatMoney, formatRupees } from "@/lib/money/format";
import { fromMinorUnits, toMinorUnits } from "@/lib/money/decimal";
import type { Money } from "@/types";

export function describeFeeDifference(estimated: Money, actual: Money): string {
  const difference = toMinorUnits(actual.value) - toMinorUnits(estimated.value);
  if (difference === 0) return "PayPal charged exactly the published fee.";
  const amount = formatMoney({
    currency: actual.currency,
    value: fromMinorUnits(Math.abs(difference)),
  });
  return `PayPal charged ${amount} ${difference > 0 ? "more" : "less"} than the published fee.`;
}

export function describeRupeeDifference(estimated: number, actual: number): string {
  const difference = Math.round(actual - estimated);
  if (difference === 0) return "The rupees match the estimate.";
  return `You received ${formatRupees(Math.abs(difference))} ${difference > 0 ? "more" : "less"} than estimated.`;
}

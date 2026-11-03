import { formatDate } from "@/lib/format-date";
import type { PayoutSource } from "@/types";

const SOURCE_WORDS: Record<PayoutSource, string> = {
  paypal: "PayPal",
  estimate: "est.",
  outside_paypal: "bank",
};

export const FEE_FROM_PAYPAL_WORD = "PayPal fee · est. rate";

// The small word beside a rupee figure. PayPal's sandbox pays out in dollars and never reports the
// rupees, so a payment can have PayPal's real fee and net while its rupees stay worked out at the
// ECB rate. That is said apart from an estimate that rests on the published fees as well.
export function payoutSourceWord(source: PayoutSource, feeFromPayPal = false): string {
  return source === "estimate" && feeFromPayPal ? FEE_FROM_PAYPAL_WORD : SOURCE_WORDS[source];
}

// What the word means, for a tooltip; only the mixed case needs one.
export function payoutSourceHint(
  source: PayoutSource,
  feeFromPayPal: boolean,
  rateDate: string | null,
): string | undefined {
  if (source !== "estimate" || !feeFromPayPal) return undefined;
  const rate = rateDate ? `the ECB rate of ${formatDate(rateDate)}` : "the ECB rate";
  return `Fee and net from PayPal; rupees at ${rate} less your markup`;
}

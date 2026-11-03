import type { PayoutSource } from "@/types";
import { payoutSourceHint, payoutSourceWord } from "./payout-source";

interface SourceTagProps {
  source: PayoutSource;
  // PayPal reported the fee and the net of this payment, whatever the source of the rupees.
  feeFromPayPal?: boolean;
  rateDate?: string | null;
}

export function SourceTag({ source, feeFromPayPal = false, rateDate = null }: SourceTagProps) {
  const word =
    source === "outside_paypal" ? "outside PayPal" : payoutSourceWord(source, feeFromPayPal);
  return (
    <span
      title={payoutSourceHint(source, feeFromPayPal, rateDate)}
      className="ml-1 rounded bg-ground px-1.5 py-0.5 text-xs text-muted-foreground"
    >
      {word}
    </span>
  );
}

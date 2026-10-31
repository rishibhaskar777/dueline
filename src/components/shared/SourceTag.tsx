import type { PayoutSource } from "@/types";

const TAGS: Record<PayoutSource, string> = {
  paypal: "PayPal",
  estimate: "est.",
  outside_paypal: "outside PayPal",
};

export function SourceTag({ source }: { source: PayoutSource }) {
  return (
    <span className="ml-1 rounded bg-ground px-1.5 py-0.5 text-xs text-muted-foreground">
      {TAGS[source]}
    </span>
  );
}

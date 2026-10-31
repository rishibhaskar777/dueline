import { useEffect, useState } from "react";
import { estimatePayout } from "@/lib/api-client";
import type { Money, PayoutEstimate } from "@/types";

const TYPING_PAUSE_MS = 300;

type Outcome = { key: string; estimate: PayoutEstimate } | { key: string; message: string };

// Asks the server for the estimate once the amount has stopped changing. `version` is anything else
// that changes the answer, such as saved settings. An answer for an older amount is never shown.
export function usePayoutEstimate(
  total: Money | null,
  version = 0,
): { estimate: PayoutEstimate | null; failure: string | null } {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const currency = total?.currency;
  const value = total?.value;
  const key = `${currency}:${value}:${version}`;

  useEffect(() => {
    if (!currency || !value) return;
    let current = true;
    const timer = setTimeout(() => {
      estimatePayout({ currency, value }).then(
        (estimate) => current && setOutcome({ key, estimate }),
        (error: unknown) =>
          current &&
          setOutcome({
            key,
            message: error instanceof Error ? error.message : "Could not work out the estimate.",
          }),
      );
    }, TYPING_PAUSE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [currency, value, key]);

  const shown = outcome?.key === key ? outcome : null;
  return {
    estimate: shown && "estimate" in shown ? shown.estimate : null,
    failure: shown && "message" in shown ? shown.message : null,
  };
}

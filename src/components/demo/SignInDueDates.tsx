"use client";

import { useSyncExternalStore } from "react";
import { sampleInvoiceDates } from "@/components/demo/sign-in-dates";
import { todayInKolkata } from "@/lib/date-math";

const subscribe = (): (() => void) => () => {};

// The page is built ahead of time, so the dates are worked out in the browser.
export function SignInDueDates() {
  const today = useSyncExternalStore(
    subscribe,
    () => todayInKolkata(),
    () => null,
  );
  const dates = today ? sampleInvoiceDates(today) : null;
  return (
    <div className="flex justify-between text-xs opacity-65">
      <span>{dates && `Sent ${dates.sent}`}</span>
      <span>{dates && `Due ${dates.due}`}</span>
    </div>
  );
}

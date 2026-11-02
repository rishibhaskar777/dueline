"use client";

import { useEffect } from "react";
import { getInvoices } from "@/lib/api-client";
import { publishOverdueCount, useOverdueCount } from "./overdue-count";

const REFRESH_MS = 5 * 60 * 1000;

// The number of overdue invoices for the Nudges tab. Receivables publishes fresher figures while
// it is open; elsewhere the count is read now and then.
export function useNudgesCount(): number {
  const count = useOverdueCount();

  useEffect(() => {
    let active = true;
    function refresh(): void {
      getInvoices().then(
        ({ totals }) => active && publishOverdueCount(totals.overdueCount),
        () => undefined,
      );
    }
    refresh();
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return count;
}

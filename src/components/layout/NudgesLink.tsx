"use client";

import { useEffect, type ReactNode } from "react";
import { getInvoices } from "@/lib/api-client";
import { NavLink } from "./NavLink";
import { publishOverdueCount, useOverdueCount } from "./overdue-count";

const REFRESH_MS = 5 * 60 * 1000;

// The Nudges item with the number of overdue invoices beside it. Receivables publishes fresher
// figures while it is open; elsewhere the count is read now and then.
export function NudgesLink({ icon }: { icon: ReactNode }) {
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

  return (
    <NavLink href="/nudges" icon={icon} label={count > 0 ? `Nudges, ${count} overdue` : undefined}>
      Nudges
      {count > 0 && (
        // The no-break space keeps the visible text "Nudges 2", which the accessible name contains.
        <span className="ml-auto">
          {" "}
          <span className="rounded-full bg-late px-2 text-xs font-semibold text-primary-foreground">
            {count}
          </span>
        </span>
      )}
    </NavLink>
  );
}

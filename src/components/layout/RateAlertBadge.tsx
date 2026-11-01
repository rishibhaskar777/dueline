"use client";

import { useEffect, useState } from "react";
import { getRateAlerts } from "@/lib/api-client";

const REFRESH_MS = 5 * 60 * 1000;

// How many of the freelancer's rate alerts are triggered, beside the page where they set them.
export function RateAlertBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    function refresh(): void {
      getRateAlerts().then(
        (alerts) => active && setCount(alerts.length),
        () => active && setCount(0),
      );
    }
    refresh();
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  if (count === 0) return null;
  return (
    <span className="ml-auto rounded-full bg-due-soon px-2 text-xs font-semibold text-primary-foreground">
      {count}
      <span className="sr-only"> rate {count === 1 ? "alert" : "alerts"} triggered</span>
    </span>
  );
}

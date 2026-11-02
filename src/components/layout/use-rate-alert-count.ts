"use client";

import { useEffect, useState } from "react";
import { getRateAlerts } from "@/lib/api-client";

const REFRESH_MS = 5 * 60 * 1000;

// How many of the freelancer's rate alerts are triggered. Read now and every few minutes.
export function useRateAlertCount(): number {
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

  return count;
}

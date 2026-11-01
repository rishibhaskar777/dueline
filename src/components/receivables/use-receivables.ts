"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { publishOverdueCount } from "@/components/layout/overdue-count";
import { getActivity, getHealth, getInvoices } from "@/lib/api-client";
import type { HealthResponse } from "@/types";
import { createPoller, type Poller } from "./poll-scheduler";
import {
  applyFailure,
  applyRefresh,
  INITIAL_STATE,
  type ReceivablesState,
} from "./receivables-state";

const REFRESH_MS = 10_000;
// Health carries today's date, which changes if the tab stays open past midnight.
const HEALTH_REFRESH_MS = 5 * 60_000;

export interface Receivables extends ReceivablesState {
  retry: () => void;
}

export function useReceivables(): Receivables {
  const [state, setState] = useState<ReceivablesState>(INITIAL_STATE);
  const poller = useRef<Poller | null>(null);

  useEffect(() => {
    let active = true;
    let health: HealthResponse | undefined;

    const current = createPoller({
      intervalMs: REFRESH_MS,
      slowIntervalMs: HEALTH_REFRESH_MS,
      isVisible: () => document.visibilityState === "visible",
      refresh: async ({ slow }) => {
        try {
          const [{ invoices, totals }, events, loadedHealth] = await Promise.all([
            getInvoices(),
            getActivity(),
            slow || !health ? getHealth() : health,
          ]);
          health = loadedHealth;
          publishOverdueCount(totals.overdueCount);
          if (active) {
            setState((previous) =>
              applyRefresh(previous, { invoices, totals, events, health: loadedHealth }),
            );
          }
        } catch (error) {
          if (active) setState((previous) => applyFailure(previous, error));
        }
      },
    });
    poller.current = current;

    const onVisible = (): void => current.trigger();
    document.addEventListener("visibilitychange", onVisible);
    current.start();
    current.trigger();

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      current.stop();
    };
  }, []);

  const retry = useCallback(() => poller.current?.trigger(), []);
  return { ...state, retry };
}

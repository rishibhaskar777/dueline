"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { publishOverdueCount } from "@/components/layout/overdue-count";
import { recall, remember } from "@/lib/remembered";
import { getActivity, getHealth, getInvoices } from "@/lib/api-client";
import { createPoller, type Poller } from "./poll-scheduler";
import {
  applyEvents,
  applyFailure,
  applyHealth,
  applyInvoices,
  INITIAL_STATE,
  type ReceivablesState,
} from "./receivables-state";

const REFRESH_MS = 10_000;
// Health carries today's date, which changes if the tab stays open past midnight.
const HEALTH_REFRESH_MS = 5 * 60_000;

export interface Receivables extends ReceivablesState {
  retry: () => void;
}

const REMEMBERED_AS = "receivables";

// Opening the page again shows what it last showed while the new answer is on its way.
function startingState(): ReceivablesState {
  const last = recall<ReceivablesState>(REMEMBERED_AS);
  return last ? { ...last, error: null, freshEvents: [] } : INITIAL_STATE;
}

export function useReceivables(): Receivables {
  const [state, setState] = useState<ReceivablesState>(startingState);
  const poller = useRef<Poller | null>(null);

  useEffect(() => {
    if (state.data) remember(REMEMBERED_AS, state);
  }, [state]);

  useEffect(() => {
    let active = true;
    let healthRead = false;

    const current = createPoller({
      intervalMs: REFRESH_MS,
      slowIntervalMs: HEALTH_REFRESH_MS,
      isVisible: () => document.visibilityState === "visible",
      refresh: async ({ slow }) => {
        // The three parts are asked for together and each is drawn the moment it answers.
        const failed = (error: unknown): void => {
          if (active) setState((previous) => applyFailure(previous, error));
        };
        const reads = [
          getInvoices().then((invoices) => {
            publishOverdueCount(invoices.totals.overdueCount);
            if (active) setState((previous) => applyInvoices(previous, invoices, Date.now()));
          }, failed),
          getActivity().then((events) => {
            if (active) setState((previous) => applyEvents(previous, events));
          }, failed),
        ];
        if (slow || !healthRead) {
          reads.push(
            getHealth().then((health) => {
              healthRead = true;
              if (active) setState((previous) => applyHealth(previous, health));
            }, failed),
          );
        }
        await Promise.all(reads);
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

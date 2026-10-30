import { ApiClientError } from "@/lib/api-client";
import type { ActivityEvent, HealthResponse, InvoiceSummary, Totals } from "@/types";
import { findNewEvents } from "./activity-text";

export interface ReceivablesData {
  invoices: InvoiceSummary[];
  totals: Totals;
  events: ActivityEvent[];
  health: HealthResponse;
}

export interface LoadError {
  message: string;
  debugId?: string;
}

export interface ReceivablesState {
  data: ReceivablesData | null;
  error: LoadError | null;
  // Events that arrived in the latest refresh that found any; the first load never counts.
  freshEvents: ActivityEvent[];
}

export const INITIAL_STATE: ReceivablesState = { data: null, error: null, freshEvents: [] };

export function toLoadError(error: unknown): LoadError {
  if (error instanceof ApiClientError) {
    return { message: error.message, debugId: error.debugId };
  }
  return {
    message: error instanceof Error ? error.message : "Could not load your receivables.",
  };
}

export function applyRefresh(
  state: ReceivablesState,
  refreshed: ReceivablesData,
): ReceivablesState {
  const arrived = state.data ? findNewEvents(state.data.events, refreshed.events) : [];
  return {
    data: refreshed,
    error: null,
    freshEvents: arrived.length > 0 ? arrived : state.freshEvents,
  };
}

// The last good data stays; only the error changes.
export function applyFailure(state: ReceivablesState, error: unknown): ReceivablesState {
  return { ...state, error: toLoadError(error) };
}

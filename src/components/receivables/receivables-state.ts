import { isSnapshotOld } from "@/components/shared/snapshot-age";
import { toLoadError, type LoadError } from "@/components/shared/load-error";
import type { ActivityEvent, HealthResponse, InvoicesResponse } from "@/types";
import { findNewEvents } from "./activity-text";

// Each part arrives on its own, so the page draws what it has: the invoices first, then the
// activity and the connection status as they answer.
export interface ReceivablesState {
  data: InvoicesResponse | null;
  events: ActivityEvent[] | null;
  health: HealthResponse | null;
  error: LoadError | null;
  // The invoices are an old reading of PayPal and a newer one is on its way.
  updating: boolean;
  // Events that arrived in the latest refresh that found any; the first load never counts.
  freshEvents: ActivityEvent[];
}

export const INITIAL_STATE: ReceivablesState = {
  data: null,
  events: null,
  health: null,
  error: null,
  updating: false,
  freshEvents: [],
};

export function applyInvoices(
  state: ReceivablesState,
  data: InvoicesResponse,
  now: number,
): ReceivablesState {
  return { ...state, data, error: null, updating: isSnapshotOld(data.loadedAt, now) };
}

export function applyEvents(state: ReceivablesState, events: ActivityEvent[]): ReceivablesState {
  const arrived = state.events ? findNewEvents(state.events, events) : [];
  return {
    ...state,
    events,
    freshEvents: arrived.length > 0 ? arrived : state.freshEvents,
  };
}

export function applyHealth(state: ReceivablesState, health: HealthResponse): ReceivablesState {
  return { ...state, health };
}

// The last good data stays; only the error changes.
export function applyFailure(state: ReceivablesState, error: unknown): ReceivablesState {
  return { ...state, error: toLoadError(error) };
}

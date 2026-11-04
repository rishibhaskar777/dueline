import { describe, expect, it } from "vitest";
import { ApiClientError } from "@/lib/api-client";
import {
  applyEvents,
  applyFailure,
  applyHealth,
  applyInvoices,
  INITIAL_STATE,
} from "@/components/receivables/receivables-state";
import { activity, health, invoices, totals } from "@/mocks/fixtures";
import type { InvoicesResponse } from "@/types";

const NOW = Date.parse("2026-10-17T10:00:00Z");
const data: InvoicesResponse = {
  invoices,
  totals,
  today: "2026-10-17",
  loadedAt: null,
  readyToSend: [],
};

describe("receivables state", () => {
  it("draws the invoices before the activity and the status have answered", () => {
    const state = applyInvoices(INITIAL_STATE, data, NOW);
    expect(state.data).toEqual(data);
    expect(state.events).toBeNull();
    expect(state.health).toBeNull();
  });

  it("says it is updating only when the invoices are an old reading of PayPal", () => {
    const old = applyInvoices(INITIAL_STATE, { ...data, loadedAt: "2026-10-17T09:50:00Z" }, NOW);
    expect(old.updating).toBe(true);
    expect(applyInvoices(old, { ...data, loadedAt: "2026-10-17T09:59:30Z" }, NOW).updating).toBe(
      false,
    );
  });

  it("takes the activity and the status in either order", () => {
    const early = applyHealth(applyEvents(INITIAL_STATE, activity), health);
    expect(applyInvoices(early, data, NOW)).toMatchObject({ data, events: activity, health });
  });

  it("does not treat the first load's events as new", () => {
    const state = applyEvents(INITIAL_STATE, activity);
    expect(state.events).toEqual(activity);
    expect(state.freshEvents).toEqual([]);
  });

  it("marks events that arrive in a later refresh", () => {
    const loaded = applyEvents(INITIAL_STATE, activity.slice(1));
    const next = applyEvents(loaded, activity);
    expect(next.freshEvents.map((event) => event.id)).toEqual(["evt-1004"]);
  });

  it("keeps the last new events when a refresh brings none", () => {
    const loaded = applyEvents(INITIAL_STATE, activity.slice(1));
    const next = applyEvents(applyEvents(loaded, activity), activity);
    expect(next.freshEvents.map((event) => event.id)).toEqual(["evt-1004"]);
  });

  it("keeps the last good data when a refresh fails, and clears the error on success", () => {
    const loaded = applyInvoices(INITIAL_STATE, data, NOW);
    const failed = applyFailure(
      loaded,
      new ApiClientError(502, "paypal_error", "PayPal said no.", "abc123"),
    );
    expect(failed.data).toEqual(data);
    expect(failed.error).toEqual({ message: "PayPal said no.", debugId: "abc123" });
    expect(applyInvoices(failed, data, NOW).error).toBeNull();
  });

  it("has an error and no data when the first load fails", () => {
    const state = applyFailure(INITIAL_STATE, new Error("offline"));
    expect(state.data).toBeNull();
    expect(state.error).toEqual({ message: "offline" });
  });
});

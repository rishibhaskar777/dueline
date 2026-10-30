import { describe, expect, it } from "vitest";
import { ApiClientError } from "@/lib/api-client";
import {
  applyFailure,
  applyRefresh,
  INITIAL_STATE,
  toLoadError,
  type ReceivablesData,
} from "@/components/receivables/receivables-state";
import { activity, health, invoices, totals } from "@/mocks/fixtures";

const data: ReceivablesData = { invoices, totals, events: activity, health };

describe("receivables state", () => {
  it("does not treat the first load's events as new", () => {
    const state = applyRefresh(INITIAL_STATE, data);
    expect(state.data).toEqual(data);
    expect(state.freshEvents).toEqual([]);
  });

  it("marks events that arrive in a later refresh", () => {
    const loaded = applyRefresh(INITIAL_STATE, { ...data, events: activity.slice(1) });
    const next = applyRefresh(loaded, data);
    expect(next.freshEvents.map((event) => event.id)).toEqual(["evt-1004"]);
  });

  it("keeps the last new events when a refresh brings none", () => {
    const loaded = applyRefresh(INITIAL_STATE, { ...data, events: activity.slice(1) });
    const next = applyRefresh(applyRefresh(loaded, data), data);
    expect(next.freshEvents.map((event) => event.id)).toEqual(["evt-1004"]);
  });

  it("keeps the last good data when a refresh fails, and clears the error on success", () => {
    const loaded = applyRefresh(INITIAL_STATE, data);
    const failed = applyFailure(
      loaded,
      new ApiClientError(502, "paypal_error", "PayPal said no.", "abc123"),
    );
    expect(failed.data).toEqual(data);
    expect(failed.error).toEqual({ message: "PayPal said no.", debugId: "abc123" });
    expect(applyRefresh(failed, data).error).toBeNull();
  });

  it("has an error and no data when the first load fails", () => {
    const state = applyFailure(INITIAL_STATE, new Error("offline"));
    expect(state.data).toBeNull();
    expect(state.error).toEqual({ message: "offline" });
  });

  it("gives a plain message for something that is not an error", () => {
    expect(toLoadError("boom").message).toBe("Could not load your receivables.");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPoller } from "@/components/receivables/poll-scheduler";

describe("createPoller", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("refreshes on every interval while visible, and stops when told to", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const poller = createPoller({
      refresh,
      intervalMs: 10_000,
      slowIntervalMs: 300_000,
      isVisible: () => true,
    });
    poller.start();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(refresh).toHaveBeenCalledTimes(3);
    poller.stop();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it("never runs two refreshes at once", async () => {
    let finish: () => void = () => {};
    const refresh = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const poller = createPoller({
      refresh,
      intervalMs: 10_000,
      slowIntervalMs: 300_000,
      isVisible: () => true,
    });
    poller.start();
    await vi.advanceTimersByTimeAsync(35_000);
    poller.trigger();
    expect(refresh).toHaveBeenCalledTimes(1);
    finish();
    await vi.advanceTimersByTimeAsync(0);
    poller.trigger();
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("pauses while hidden and refreshes at once when visible again", async () => {
    let visible = false;
    const refresh = vi.fn().mockResolvedValue(undefined);
    const poller = createPoller({
      refresh,
      intervalMs: 10_000,
      slowIntervalMs: 300_000,
      isVisible: () => visible,
    });
    poller.start();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(refresh).not.toHaveBeenCalled();
    visible = true;
    poller.trigger();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps going after a refresh fails", async () => {
    const refresh = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValue(undefined);
    const poller = createPoller({
      refresh,
      intervalMs: 10_000,
      slowIntervalMs: 300_000,
      isVisible: () => true,
    });
    poller.start();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("asks for the slow data on the first refresh, then once every slow interval", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const poller = createPoller({
      refresh,
      intervalMs: 10_000,
      slowIntervalMs: 300_000,
      isVisible: () => true,
    });
    poller.trigger();
    poller.start();
    await vi.advanceTimersByTimeAsync(600_000);
    const slowCalls = refresh.mock.calls.filter(([options]) => options.slow).length;
    expect(refresh.mock.calls[0]?.[0]).toEqual({ slow: true });
    expect(refresh).toHaveBeenCalledTimes(61);
    expect(slowCalls).toBe(3);
  });

  it("does not use up the slow turn while the tab is hidden", async () => {
    let visible = false;
    const refresh = vi.fn().mockResolvedValue(undefined);
    const poller = createPoller({
      refresh,
      intervalMs: 10_000,
      slowIntervalMs: 300_000,
      isVisible: () => visible,
    });
    poller.start();
    await vi.advanceTimersByTimeAsync(900_000);
    visible = true;
    poller.trigger();
    expect(refresh).toHaveBeenCalledWith({ slow: true });
  });
});

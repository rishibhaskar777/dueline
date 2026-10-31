import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { claimRequest } from "@/lib/requests/claim-request";
import { DuplicateRequestError } from "@/lib/requests/errors";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Json, Store } from "@/lib/store/store";

const messages = { conflict: "Different details.", inProgress: "Still running." };
const readStored = (stored: Json): string => String(stored);

describe("claimRequest", () => {
  let store: Store;

  beforeEach(() => {
    store = createMemoryStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("owns a request ID it has not seen", async () => {
    expect(await claimRequest(store, "r1", "hash", messages, readStored)).toEqual({
      kind: "owned",
      recovered: false,
    });
  });

  it("returns the stored result for a repeat of a finished request", async () => {
    await claimRequest(store, "r1", "hash", messages, readStored);
    await store.complete("r1", "done");
    expect(await claimRequest(store, "r1", "hash", messages, readStored)).toEqual({
      kind: "replay",
      result: "done",
    });
  });

  it("refuses the same ID with a different body", async () => {
    await claimRequest(store, "r1", "hash", messages, readStored);
    await expect(claimRequest(store, "r1", "other", messages, readStored)).rejects.toThrow(
      new DuplicateRequestError(messages.conflict),
    );
  });

  it("refuses a repeat while the first request is still recent", async () => {
    await claimRequest(store, "r1", "hash", messages, readStored);
    await expect(claimRequest(store, "r1", "hash", messages, readStored)).rejects.toThrow(
      new DuplicateRequestError(messages.inProgress),
    );
  });

  it("lets a repeat take over a request that was cut off", async () => {
    await claimRequest(store, "r1", "hash", messages, readStored);
    vi.advanceTimersByTime(3 * 60 * 1000);
    expect(await claimRequest(store, "r1", "hash", messages, readStored)).toEqual({
      kind: "owned",
      recovered: true,
    });
  });
});

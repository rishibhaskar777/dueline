import { beforeEach, describe, expect, it, vi } from "vitest";
import { DuplicateRequestError } from "@/lib/requests/errors";
import { runClaimed } from "@/lib/requests/run-claimed";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Json, Store } from "@/lib/store/store";

const messages = { conflict: "Different details.", inProgress: "Still running." };
const readStored = (stored: Json): { value: number } => {
  if (typeof stored === "object" && stored !== null && !Array.isArray(stored)) {
    if (typeof stored.value === "number") return { value: stored.value };
  }
  throw new Error("unreadable");
};

describe("runClaimed", () => {
  let store: Store;

  beforeEach(() => {
    store = createMemoryStore();
  });

  const claimed = (
    requestId: string,
    run: () => Promise<{ value: number }>,
    extra: { body?: unknown; afterRun?: (r: { value: number }) => Promise<void> } = {},
  ) =>
    runClaimed(store, { requestId, body: extra.body ?? {}, messages, readStored, run, ...extra });

  it("runs once and returns the stored result for a repeat", async () => {
    const run = vi.fn(async () => ({ value: 1 }));
    expect(await claimed("r1", run)).toEqual({ value: 1 });
    expect(await claimed("r1", run)).toEqual({ value: 1 });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("refuses the same ID with another body", async () => {
    await claimed("r1", async () => ({ value: 1 }), { body: { a: 1 } });
    await expect(claimed("r1", async () => ({ value: 2 }), { body: { a: 2 } })).rejects.toThrow(
      new DuplicateRequestError(messages.conflict),
    );
  });

  it("releases the ID when run fails, so the user can try again", async () => {
    await expect(
      claimed("r1", async () => {
        throw new Error("PayPal said no");
      }),
    ).rejects.toThrow("PayPal said no");
    expect(await claimed("r1", async () => ({ value: 2 }))).toEqual({ value: 2 });
  });

  it("runs afterRun with the result before completing", async () => {
    const afterRun = vi.fn(async () => {});
    await claimed("r1", async () => ({ value: 3 }), { afterRun });
    expect(afterRun).toHaveBeenCalledWith({ value: 3 });
  });

  it("keeps the ID claimed when afterRun fails, so a retry cannot repeat the write", async () => {
    const run = vi.fn(async () => ({ value: 4 }));
    await expect(
      claimed("r1", run, {
        afterRun: async () => {
          throw new Error("log failed");
        },
      }),
    ).rejects.toThrow("log failed");

    await expect(claimed("r1", run)).rejects.toThrow(
      new DuplicateRequestError(messages.inProgress),
    );
    expect(run).toHaveBeenCalledTimes(1);
  });
});

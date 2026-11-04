import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveSnapshot } from "@/lib/paypal/invoice-cache";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { stubEnv } from "../support/env";

let store: Store;
let snapshotReads: number;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

beforeEach(async () => {
  stubEnv({ DEMO_TODAY: "2026-11-04" });
  vi.resetModules();
  const memory = createMemoryStore();
  snapshotReads = 0;
  store = {
    ...memory,
    getCached: (key) => {
      if (key.startsWith("invoices:snapshot")) snapshotReads += 1;
      return memory.getCached(key);
    },
  };
  await saveSnapshot({ builtAt: Date.now(), entries: [] });
  snapshotReads = 0;
});

describe("the first reads on a new server instance", () => {
  it("share one read of the stored snapshot however many screens ask at once", async () => {
    const { loadInvoices, loadReadyInvoices } = await import("@/lib/paypal/summaries");

    await Promise.all([loadInvoices(), loadReadyInvoices(), loadInvoices(), loadReadyInvoices()]);

    expect(snapshotReads).toBe(1);
  });

  it("read the stored snapshot again once this instance's copy is old", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const { loadInvoices } = await import("@/lib/paypal/summaries");
      await loadInvoices();
      await loadInvoices();
      expect(snapshotReads).toBe(1);

      vi.setSystemTime(Date.now() + 6_000);
      await loadInvoices();
      expect(snapshotReads).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

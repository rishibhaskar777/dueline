import { beforeEach, describe, expect, it, vi } from "vitest";
import { stubEnv } from "../support/env";

async function loadStoreModule(): Promise<typeof import("@/lib/store")> {
  vi.resetModules();
  return import("@/lib/store");
}

describe("store selection", () => {
  beforeEach(() => stubEnv());

  it("uses the in-memory store when DATABASE_URL is not set", async () => {
    const { getStore, storageKind } = await loadStoreModule();
    expect(storageKind()).toBe("memory");
    await expect(getStore().ping()).resolves.toBeUndefined();
  });

  it("returns the same store on every call", async () => {
    const { getStore } = await loadStoreModule();
    expect(getStore()).toBe(getStore());
  });

  it("reports postgres when DATABASE_URL is set", async () => {
    stubEnv({ DATABASE_URL: "postgres://user:pass@localhost:5432/dueline" });
    const { storageKind } = await loadStoreModule();
    expect(storageKind()).toBe("postgres");
  });
});

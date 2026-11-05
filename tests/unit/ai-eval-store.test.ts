import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { stubEnv } from "../support/env";

// The driver itself is replaced, so any attempt to open a connection is counted.
const connect = vi.fn(() => {
  throw new Error("The evaluation tried to open a database connection.");
});
vi.mock("postgres", () => ({ default: connect }));

const UNREACHABLE = "postgres://user:secret@127.0.0.1:1/dueline";

beforeEach(() => {
  vi.resetModules();
  connect.mockClear();
  stubEnv({ DATABASE_URL: UNREACHABLE });
});

describe("the accuracy evaluation's store", () => {
  it("is the memory store even when DATABASE_URL names a database", async () => {
    const { getStore, storageKind, switchToMemoryStore } = await import("@/lib/store");
    expect(storageKind()).toBe("postgres");
    switchToMemoryStore();

    const store = getStore();
    expect(await store.hitRateLimit("extract:script", 60)).toBe(1);
    expect(await store.hitRateLimit("extract:script", 60)).toBe(2);
    expect(connect).not.toHaveBeenCalled();
  });

  it("serves the usage counter and the profile the evaluation reads without a connection", async () => {
    const { switchToMemoryStore } = await import("@/lib/store");
    switchToMemoryStore();
    const { reserveDailyModelCall } = await import("@/lib/ai/quota");
    const { getProfile } = await import("@/lib/profile");

    await expect(reserveDailyModelCall()).resolves.toBeUndefined();
    await expect(getProfile()).resolves.toHaveProperty("signOff");
    expect(connect).not.toHaveBeenCalled();
  });

  it("would try to connect without the switch, which is what the script avoids", async () => {
    const { getStore } = await import("@/lib/store");
    expect(() => getStore()).toThrow("database connection");
    expect(connect).toHaveBeenCalledTimes(1);
  });
});

describe("scripts/ai-eval.ts", () => {
  const script = readFileSync("scripts/ai-eval.ts", "utf8");
  const main = script.slice(script.indexOf("async function main"));

  it("switches to the memory store before it reads the environment or asks for anything", () => {
    const switched = main.indexOf("switchToMemoryStore()");
    expect(switched).toBeGreaterThan(-1);
    for (const later of ["getEnv()", "chatIds()", "evaluate("]) {
      expect(switched, later).toBeLessThan(main.indexOf(later));
    }
  });

  it("writes only docs/evaluation/extraction.md, and only with --write", () => {
    expect(script.match(/writeFile\(/g)).toHaveLength(1);
    expect(script).toContain('const REPORT_PATH = "docs/evaluation/extraction.md"');
    expect(script).toMatch(/writeFile\(REPORT_PATH,/);
    const afterGuard = script.slice(script.indexOf("if (WRITE_REPORT)"));
    expect(afterGuard.indexOf("writeFile(")).toBeGreaterThan(-1);
    expect(script.slice(0, script.indexOf("if (WRITE_REPORT)"))).not.toContain("writeFile(REPORT");
  });

  it("opens no database client of its own", () => {
    expect(script).not.toMatch(/postgres|createSqlClient|getEnv\(\)\.DATABASE_URL/);
  });
});

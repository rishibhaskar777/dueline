import { describe, expect, it } from "vitest";
import { createPostgresStore } from "@/lib/store/postgres-store";

type Sql = Parameters<typeof createPostgresStore>[0];

// Answers each query with the next prepared result and records the values it was given.
function fakeSql(...results: unknown[][]): { sql: Sql; values: unknown[][] } {
  const queue = [...results];
  const values: unknown[][] = [];
  const tag = async (_strings: TemplateStringsArray, ...params: unknown[]): Promise<unknown[]> => {
    values.push(params);
    return queue.shift() ?? [];
  };
  return { sql: Object.assign(tag, { json: (value: unknown) => value }) as unknown as Sql, values };
}

describe("postgres store", () => {
  it("claims a request ID that has not been used", async () => {
    const { sql } = fakeSql([{ request_id: "req-1" }]);
    expect(await createPostgresStore(sql).claim("req-1", "hash")).toEqual({ kind: "new" });
  });

  it("replays the stored result of a completed request", async () => {
    const { sql } = fakeSql([], [{ body_hash: "hash", status: "completed", result: { ok: true } }]);
    expect(await createPostgresStore(sql).claim("req-1", "hash")).toEqual({
      kind: "replay",
      result: { ok: true },
    });
  });

  it("reports a conflict when the body differs", async () => {
    const { sql } = fakeSql([], [{ body_hash: "other", status: "completed", result: {} }]);
    expect(await createPostgresStore(sql).claim("req-1", "hash")).toEqual({ kind: "conflict" });
  });

  it("reports a request that has no result yet as in progress", async () => {
    const { sql } = fakeSql([], [{ body_hash: "hash", status: "in_progress", result: null }]);
    expect(await createPostgresStore(sql).claim("req-1", "hash")).toEqual({ kind: "in_progress" });
  });

  it("processes a webhook event once", async () => {
    const { sql } = fakeSql([{ event_id: "WH-1" }], []);
    const store = createPostgresStore(sql);
    expect(await store.markProcessed("WH-1")).toBe(true);
    expect(await store.markProcessed("WH-1")).toBe(false);
  });

  it("returns no settings before any are saved", async () => {
    const { sql } = fakeSql([]);
    expect(await createPostgresStore(sql).getSettings()).toBeNull();
  });

  it("converts a stored rate to a number", async () => {
    const { sql } = fakeSql([{ rate: "83.412500" }], []);
    const store = createPostgresStore(sql);
    expect(await store.getRate("USD", "2026-10-17")).toBe(83.4125);
    expect(await store.getRate("EUR", "2026-10-17")).toBeNull();
  });

  it("turns activity rows into events", async () => {
    const at = new Date("2026-10-17T08:30:00Z");
    const { sql } = fakeSql([
      {
        id: "a1",
        kind: "paid",
        invoice_id: "INV2-1",
        invoice_number: "INV-0001",
        client_name: "Tandem Health",
        at,
        amount: null,
      },
    ]);
    expect(await createPostgresStore(sql).latestActivity(20)).toEqual([
      {
        id: "a1",
        kind: "paid",
        invoiceId: "INV2-1",
        invoiceNumber: "INV-0001",
        clientName: "Tandem Health",
        at: "2026-10-17T08:30:00.000Z",
      },
    ]);
  });
});

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

  it("turns the latest rate rows into one set of rates", async () => {
    const row = (currency: string, rate: string) => ({
      currency,
      rate,
      on_date: "2026-10-28",
      fetched_on: "2026-10-29",
    });
    const { sql } = fakeSql(
      [
        row("USD", "85.000000"),
        row("EUR", "102.000000"),
        row("GBP", "127.500000"),
        row("CAD", "63.750000"),
        row("AUD", "56.666700"),
      ],
      [row("USD", "85.000000")],
    );
    const store = createPostgresStore(sql);
    expect(await store.getLatestRates()).toEqual({
      rates: { USD: 85, EUR: 102, GBP: 127.5, CAD: 63.75, AUD: 56.6667 },
      onDate: "2026-10-28",
      fetchedOn: "2026-10-29",
    });
    expect(await store.getLatestRates()).toBeNull();
  });

  it("writes one row per currency when storing rates", async () => {
    const { sql, values } = fakeSql();
    const rates = { USD: 85, EUR: 102, GBP: 127.5, CAD: 63.75, AUD: 56.6667 };
    await createPostgresStore(sql).putRates({
      rates,
      onDate: "2026-10-28",
      fetchedOn: "2026-10-29",
    });
    expect(values).toHaveLength(5);
    expect(values[0]).toEqual(["USD", "2026-10-28", "2026-10-29", 85]);
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

import { describe, expect, it } from "vitest";
import { createMemoryStore } from "@/lib/store/memory-store";
import { createPostgresStore } from "@/lib/store/postgres-store";

type Sql = Parameters<typeof createPostgresStore>[0];

function fakeSql(...results: unknown[][]): { sql: Sql; values: unknown[][] } {
  const queue = [...results];
  const values: unknown[][] = [];
  const tag = async (_strings: TemplateStringsArray, ...params: unknown[]): Promise<unknown[]> => {
    values.push(params);
    return queue.shift() ?? [];
  };
  return { sql: Object.assign(tag, { json: (value: unknown) => value }) as unknown as Sql, values };
}

describe("client notes in the memory store", () => {
  it("is empty until notes are saved, and keeps each client's apart", async () => {
    const store = createMemoryStore();
    expect(await store.getClientNotes("okafor-reyes")).toBe("");

    await store.saveClientNotes("okafor-reyes", "Pays by wire.");
    await store.saveClientNotes("brightwell-labs", "Net 14.");

    expect(await store.getClientNotes("okafor-reyes")).toBe("Pays by wire.");
    expect(await store.getClientNotes("brightwell-labs")).toBe("Net 14.");
  });

  it("replaces earlier notes", async () => {
    const store = createMemoryStore();
    await store.saveClientNotes("okafor-reyes", "first");
    await store.saveClientNotes("okafor-reyes", "second");
    expect(await store.getClientNotes("okafor-reyes")).toBe("second");
  });
});

describe("client notes in the Postgres store", () => {
  it("reads saved notes, and an empty string when there are none", async () => {
    const { sql, values } = fakeSql([{ notes: "Pays by wire." }], []);
    const store = createPostgresStore(sql);

    expect(await store.getClientNotes("okafor-reyes")).toBe("Pays by wire.");
    expect(await store.getClientNotes("nobody")).toBe("");
    expect(values).toEqual([["okafor-reyes"], ["nobody"]]);
  });

  it("saves notes by client key, replacing earlier ones", async () => {
    const { sql, values } = fakeSql([]);
    await createPostgresStore(sql).saveClientNotes("okafor-reyes", "Pays by wire.");
    expect(values).toEqual([["okafor-reyes", "Pays by wire."]]);
  });
});

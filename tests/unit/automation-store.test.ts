import { describe, expect, it } from "vitest";
import { createMemoryStore } from "@/lib/store/memory-store";
import { createPostgresStore } from "@/lib/store/postgres-store";
import type { LibraryItem, QueueItem, RepeatSchedule } from "@/types";

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

const item: QueueItem = {
  id: "reminder.INV2-1",
  kind: "reminder",
  title: "Remind Okafor & Reyes about INV-0001",
  detail: "€720.00, 7 days late.",
  invoiceId: "INV2-1",
  repeatId: null,
};

const repeat: RepeatSchedule = {
  id: "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c",
  clientKey: "halden-coffee-co",
  clientName: "Halden Coffee Co.",
  clientEmail: "buyer@personal.example.com",
  currency: "USD",
  items: [{ name: "Retainer", quantity: 1, unitAmount: "500.00", sac: "998391" }],
  purposeCode: "P1099",
  includeLutNote: true,
  dayOfMonth: 1,
  nextOn: "2026-12-01",
  paused: false,
};

const library: LibraryItem = {
  id: "7a1c9d52-3b8e-4f60-a2d4-5e6f708192a3",
  name: "Logo option",
  unitAmount: "120.00",
  currency: "USD",
  sac: "998391",
};

describe("the queue in the memory store", () => {
  it("lists the items in the order they were added", async () => {
    const store = createMemoryStore();
    await store.addQueueItem(item);
    await store.addQueueItem({ ...item, id: "second" });

    expect((await store.listQueue()).map(({ id }) => id)).toEqual([item.id, "second"]);
  });

  it("adds an item once and removes it for good", async () => {
    const store = createMemoryStore();
    expect(await store.addQueueItem(item)).toBe(true);
    expect(await store.addQueueItem(item)).toBe(false);

    expect(await store.removeQueueItem(item.id)).toBe(true);
    expect(await store.listQueue()).toEqual([]);
  });

  it("does not remove an item that is not there", async () => {
    expect(await createMemoryStore().removeQueueItem("nope")).toBe(false);
  });

  it("replaces the items of one kind and leaves the others", async () => {
    const store = createMemoryStore();
    const retainer: QueueItem = { ...item, id: "repeat.r.2026-11-01", kind: "repeat" };
    await store.addQueueItem(item);
    await store.addQueueItem(retainer);

    await store.replaceQueueItems("reminder", [{ ...item, id: "reminder.INV2-2" }]);
    expect((await store.listQueue()).map(({ id }) => id)).toEqual([retainer.id, "reminder.INV2-2"]);

    await store.replaceQueueItems("reminder", []);
    expect((await store.listQueue()).map(({ id }) => id)).toEqual([retainer.id]);
  });
});

describe("repeats and library items in the memory store", () => {
  it("saves, replaces and deletes a repeat", async () => {
    const store = createMemoryStore();
    await store.saveRepeat(repeat);
    await store.saveRepeat({ ...repeat, paused: true });
    expect(await store.listRepeats()).toEqual([{ ...repeat, paused: true }]);

    expect(await store.deleteRepeat(repeat.id)).toBe(true);
    expect(await store.deleteRepeat(repeat.id)).toBe(false);
    expect(await store.listRepeats()).toEqual([]);
  });

  it("saves, renames and deletes a library item", async () => {
    const store = createMemoryStore();
    await store.saveLibraryItem(library);
    await store.saveLibraryItem({ ...library, name: "Logo concept" });
    expect((await store.listLibraryItems()).map(({ name }) => name)).toEqual(["Logo concept"]);

    expect(await store.deleteLibraryItem(library.id)).toBe(true);
    expect(await store.deleteLibraryItem(library.id)).toBe(false);
  });
});

describe("a client's reminder language", () => {
  it("is English until one is saved, and is kept per client", async () => {
    const store = createMemoryStore();
    expect(await store.getClientLanguage("okafor-reyes")).toBe("en");

    await store.saveClientLanguage("okafor-reyes", "de");
    await store.saveClientLanguage("brightwell-labs", "fr");

    expect(await store.getClientLanguage("okafor-reyes")).toBe("de");
    expect(await store.getClientLanguage("brightwell-labs")).toBe("fr");
  });

  it("does not touch the notes", async () => {
    const store = createMemoryStore();
    await store.saveClientNotes("okafor-reyes", "Pays by wire.");
    await store.saveClientLanguage("okafor-reyes", "de");
    expect(await store.getClientNotes("okafor-reyes")).toBe("Pays by wire.");
  });
});

describe("the new tables in the Postgres store", () => {
  it("adds a queue item once", async () => {
    const { sql, values } = fakeSql([{ id: item.id }], []);
    const store = createPostgresStore(sql);
    expect(await store.addQueueItem(item)).toBe(true);
    expect(await store.addQueueItem(item)).toBe(false);
    expect(values[0].slice(0, 2)).toEqual([item.id, item.kind]);
  });

  it("lists the items and removes one", async () => {
    const { sql, values } = fakeSql([{ item }], [{ id: item.id }], []);
    const store = createPostgresStore(sql);
    expect(await store.listQueue()).toEqual([item]);
    expect(await store.removeQueueItem(item.id)).toBe(true);
    expect(await store.removeQueueItem("nope")).toBe(false);
    expect(values.slice(1).map((row) => row[0])).toEqual([item.id, "nope"]);
  });

  it("replaces the items of one kind by deleting them and inserting the new ones", async () => {
    const { sql, values } = fakeSql([], [{ id: item.id }]);
    await createPostgresStore(sql).replaceQueueItems("reminder", [item]);
    expect(values[0]).toEqual(["reminder"]);
    expect(values[1].slice(0, 2)).toEqual([item.id, item.kind]);
  });

  it("reads and writes repeats", async () => {
    const { sql, values } = fakeSql([{ value: repeat }], [], [{ id: repeat.id }], []);
    const store = createPostgresStore(sql);
    expect(await store.listRepeats()).toEqual([repeat]);
    await store.saveRepeat(repeat);
    expect(await store.deleteRepeat(repeat.id)).toBe(true);
    expect(await store.deleteRepeat(repeat.id)).toBe(false);
    expect(values[1][0]).toBe(repeat.id);
  });

  it("reads and writes library items", async () => {
    const { sql } = fakeSql([{ value: library }], [], [{ id: library.id }]);
    const store = createPostgresStore(sql);
    expect(await store.listLibraryItems()).toEqual([library]);
    await store.saveLibraryItem(library);
    expect(await store.deleteLibraryItem(library.id)).toBe(true);
  });

  it("reads a client's language, English when none is saved, and saves one", async () => {
    const { sql, values } = fakeSql([{ language: "de" }], [], []);
    const store = createPostgresStore(sql);
    expect(await store.getClientLanguage("okafor-reyes")).toBe("de");
    expect(await store.getClientLanguage("new-client")).toBe("en");
    await store.saveClientLanguage("okafor-reyes", "fr");
    expect(values[2]).toEqual(["okafor-reyes", "fr"]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FormItem } from "@/components/invoices/invoice-form";
import { isBlankItem, libraryInputFrom } from "@/components/library/library-input";
import { LIBRARY_LIMIT, LibraryFullError, LibraryItemNotFoundError } from "@/lib/automation/errors";
import { deleteLibraryItem, listLibrary, saveLibraryItem } from "@/lib/automation/library";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import { saveLibraryItemRequestSchema } from "@/types";

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

beforeEach(() => {
  store = createMemoryStore();
});

const logo = { name: "Logo option", unitAmount: "120.00", currency: "USD", sac: "998391" } as const;

describe("saveLibraryItem", () => {
  it("saves an item and lists items by name", async () => {
    await saveLibraryItem({ ...logo, name: "Revision round" });
    await saveLibraryItem(logo);
    expect((await listLibrary()).map(({ name }) => name)).toEqual([
      "Logo option",
      "Revision round",
    ]);
  });

  it("updates the item with the same name and currency instead of adding another", async () => {
    const first = await saveLibraryItem(logo);
    const again = await saveLibraryItem({ ...logo, name: "  logo OPTION ", unitAmount: "150.00" });

    expect(again.id).toBe(first.id);
    expect(await listLibrary()).toHaveLength(1);
    expect((await listLibrary())[0].unitAmount).toBe("150.00");
  });

  it("keeps the same name in another currency as another item", async () => {
    await saveLibraryItem(logo);
    await saveLibraryItem({ ...logo, currency: "EUR" });
    expect(await listLibrary()).toHaveLength(2);
  });

  it("renames the item it is given the ID of", async () => {
    const saved = await saveLibraryItem(logo);
    const renamed = await saveLibraryItem({ ...saved, name: "Logo concept" });
    expect(renamed).toEqual({ ...saved, name: "Logo concept" });
    expect(await listLibrary()).toHaveLength(1);
  });

  it("refuses an ID that is not in the library", async () => {
    await expect(
      saveLibraryItem({ ...logo, id: "7a1c9d52-3b8e-4f60-a2d4-5e6f708192a3" }),
    ).rejects.toBeInstanceOf(LibraryItemNotFoundError);
  });

  it("holds at most 50 items, but still updates one when full", async () => {
    for (let index = 0; index < LIBRARY_LIMIT; index++) {
      await saveLibraryItem({ ...logo, name: `Item ${index}` });
    }
    await expect(saveLibraryItem({ ...logo, name: "One too many" })).rejects.toBeInstanceOf(
      LibraryFullError,
    );
    await expect(
      saveLibraryItem({ ...logo, name: "Item 3", unitAmount: "9.00" }),
    ).resolves.toMatchObject({
      unitAmount: "9.00",
    });
  });
});

describe("deleteLibraryItem", () => {
  it("deletes an item, and refuses one that is gone", async () => {
    const saved = await saveLibraryItem(logo);
    await deleteLibraryItem(saved.id);
    expect(await listLibrary()).toEqual([]);
    await expect(deleteLibraryItem(saved.id)).rejects.toBeInstanceOf(LibraryItemNotFoundError);
  });
});

describe("the library item request", () => {
  it("accepts a priced item with or without a SAC", () => {
    expect(saveLibraryItemRequestSchema.safeParse(logo).success).toBe(true);
    expect(saveLibraryItemRequestSchema.safeParse({ ...logo, sac: null }).success).toBe(true);
  });

  it.each([
    ["no name", { name: "  " }],
    ["a price of zero", { unitAmount: "0" }],
    ["a price with three decimals", { unitAmount: "1.234" }],
    ["a SAC that does not start with 99", { sac: "123456" }],
    ["an unknown currency", { currency: "JPY" }],
    ["an ID that is not a UUID", { id: "abc" }],
  ])("refuses %s", (_label, change) => {
    expect(saveLibraryItemRequestSchema.safeParse({ ...logo, ...change }).success).toBe(false);
  });
});

describe("libraryInputFrom", () => {
  const row: FormItem = {
    key: "k",
    name: " Logo option ",
    quantity: "3",
    unitAmount: " 120 ",
    sac: "",
  };

  it("takes the name, price and SAC of a row, in the invoice's currency", () => {
    expect(libraryInputFrom(row, "USD")).toEqual({
      ok: true,
      item: { name: "Logo option", unitAmount: "120", currency: "USD", sac: null },
    });
  });

  it("says what is missing", () => {
    expect(libraryInputFrom({ ...row, name: "" }, "USD")).toMatchObject({ ok: false });
    expect(libraryInputFrom({ ...row, unitAmount: "" }, "USD")).toEqual({
      ok: false,
      message: "Enter a unit price first, like 120 or 45.50.",
    });
    expect(libraryInputFrom({ ...row, sac: "12" }, "USD")).toMatchObject({ ok: false });
  });

  it("knows an empty starting row", () => {
    expect(isBlankItem({ ...row, name: "", unitAmount: "" })).toBe(true);
    expect(isBlankItem(row)).toBe(false);
  });
});

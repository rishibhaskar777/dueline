import "server-only";
import { getStore } from "@/lib/store";
import type { LibraryItem } from "@/types";
import { LIBRARY_LIMIT, LibraryFullError, LibraryItemNotFoundError } from "./errors";

type LibraryInput = Omit<LibraryItem, "id"> & { id?: string };

function sameItem(a: LibraryItem, b: Omit<LibraryItem, "id">): boolean {
  return a.currency === b.currency && a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
}

export async function listLibrary(): Promise<LibraryItem[]> {
  const items = await getStore().listLibraryItems();
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

// An item with an ID changes that item (a rename or a new price). Without one, saving the same name
// in the same currency again updates the item that is there, so the library holds each only once.
export async function saveLibraryItem(input: LibraryInput): Promise<LibraryItem> {
  const store = getStore();
  const items = await store.listLibraryItems();
  const { id: requested, ...fields } = input;

  if (requested && !items.some((item) => item.id === requested)) {
    throw new LibraryItemNotFoundError();
  }
  const existing = requested
    ? items.find((item) => item.id === requested)
    : items.find((item) => sameItem(item, fields));
  if (!existing && items.length >= LIBRARY_LIMIT) throw new LibraryFullError();

  const saved: LibraryItem = { ...fields, id: existing?.id ?? crypto.randomUUID() };
  await store.saveLibraryItem(saved);
  return saved;
}

export async function deleteLibraryItem(id: string): Promise<void> {
  if (!(await getStore().deleteLibraryItem(id))) throw new LibraryItemNotFoundError();
}

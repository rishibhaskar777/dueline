export class QueueItemNotFoundError extends Error {
  constructor() {
    super("That item is not in the queue.");
    this.name = "QueueItemNotFoundError";
  }
}

export class RepeatNotFoundError extends Error {
  constructor() {
    super("No repeat with that ID exists.");
    this.name = "RepeatNotFoundError";
  }
}

export class LibraryItemNotFoundError extends Error {
  constructor() {
    super("No library item with that ID exists.");
    this.name = "LibraryItemNotFoundError";
  }
}

export const LIBRARY_LIMIT = 50;

export class LibraryFullError extends Error {
  constructor() {
    super(`The item library holds ${LIBRARY_LIMIT} items. Delete one to save another.`);
    this.name = "LibraryFullError";
  }
}

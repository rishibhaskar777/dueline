export class ClientNotFoundError extends Error {
  constructor() {
    super("No client with that key exists.");
    this.name = "ClientNotFoundError";
  }
}

export class ClientMergeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientMergeError";
  }
}

export class ClientNotFoundError extends Error {
  constructor() {
    super("No client with that key exists.");
    this.name = "ClientNotFoundError";
  }
}

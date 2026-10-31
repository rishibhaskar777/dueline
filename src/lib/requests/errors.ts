export class DuplicateRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateRequestError";
  }
}

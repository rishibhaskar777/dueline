// The promised date is outside the range Dueline accepts.
export class InvalidPromiseDateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPromiseDateError";
  }
}

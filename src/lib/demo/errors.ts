export class DemoUnavailableError extends Error {
  constructor() {
    super("The demo reset is not available.");
    this.name = "DemoUnavailableError";
  }
}

export class DemoResetLimitError extends Error {
  constructor(minutes: number) {
    super(
      `The demo was reset a few minutes ago. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`,
    );
    this.name = "DemoResetLimitError";
  }
}

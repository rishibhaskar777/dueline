// The invoice cannot be chased, for a reason the user can act on.
export class InvalidReminderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidReminderError";
  }
}

export class ReminderLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReminderLimitError";
  }
}

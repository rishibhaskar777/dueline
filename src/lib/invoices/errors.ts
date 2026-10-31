export class InvoiceNotFoundError extends Error {
  constructor() {
    super("No invoice with that ID exists.");
    this.name = "InvoiceNotFoundError";
  }
}

// PayPal did not answer while creating the invoice, so it may or may not exist.
export class CreateOutcomeUnknownError extends Error {
  constructor() {
    super("PayPal did not answer in time. Check Receivables before trying again.");
    this.name = "CreateOutcomeUnknownError";
  }
}

// The request is well formed but not allowed for this invoice, e.g. a payment dated in the future.
export class InvalidActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidActionError";
  }
}

// The invoice's status does not allow the action, e.g. cancelling one that is already paid.
export class InvoiceStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceStateError";
  }
}

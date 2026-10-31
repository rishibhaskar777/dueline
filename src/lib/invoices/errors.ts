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

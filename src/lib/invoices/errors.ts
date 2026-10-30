export class RecipientNotAllowedError extends Error {
  constructor() {
    super("In the demo, invoices can only go to PayPal sandbox buyers.");
    this.name = "RecipientNotAllowedError";
  }
}

export class DuplicateRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateRequestError";
  }
}

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

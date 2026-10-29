export interface PayPalErrorDetail {
  field?: string;
  issue?: string;
  description?: string;
}

export class PayPalApiError extends Error {
  readonly status: number;
  readonly paypalName: string;
  readonly debugId?: string;
  readonly details: PayPalErrorDetail[];

  constructor(init: {
    status: number;
    paypalName: string;
    message: string;
    debugId?: string;
    details?: PayPalErrorDetail[];
  }) {
    super(init.message);
    this.name = "PayPalApiError";
    this.status = init.status;
    this.paypalName = init.paypalName;
    this.debugId = init.debugId;
    this.details = init.details ?? [];
  }
}

export class PayPalTimeoutError extends Error {
  constructor() {
    super("PayPal did not answer in time. The result is unknown, check PayPal before retrying.");
    this.name = "PayPalTimeoutError";
  }
}

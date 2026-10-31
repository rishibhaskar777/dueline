import { ConfigError } from "@/lib/env";
import { DemoResetLimitError, DemoUnavailableError } from "@/lib/demo/errors";
import { RecipientNotAllowedError } from "@/lib/demo-guard";
import { CreateOutcomeUnknownError, InvoiceNotFoundError } from "@/lib/invoices/errors";
import { PayPalApiError, PayPalTimeoutError } from "@/lib/paypal/errors";
import { InvalidReminderError, ReminderLimitError } from "@/lib/reminders/errors";
import { DuplicateRequestError } from "@/lib/requests/errors";
import { fail } from "@/app/api/_lib/respond";

export function failFromError(error: unknown): Response {
  if (error instanceof ConfigError) return fail(500, "config_error", error.message);
  if (error instanceof RecipientNotAllowedError) {
    return fail(403, "recipient_not_allowed", error.message);
  }
  if (error instanceof DemoUnavailableError) return fail(404, "not_found", error.message);
  if (error instanceof DemoResetLimitError) return fail(429, "rate_limited", error.message);
  if (error instanceof InvalidReminderError) return fail(400, "invalid_request", error.message);
  if (error instanceof ReminderLimitError) return fail(429, "rate_limited", error.message);
  if (error instanceof InvoiceNotFoundError) return fail(404, "not_found", error.message);
  if (error instanceof DuplicateRequestError) {
    return fail(409, "duplicate_request", error.message);
  }
  if (error instanceof CreateOutcomeUnknownError) {
    return fail(504, "paypal_timeout", error.message);
  }
  if (error instanceof PayPalApiError) {
    return fail(502, "paypal_error", `PayPal returned an error: ${error.message}`, error.debugId);
  }
  if (error instanceof PayPalTimeoutError) return fail(502, "paypal_error", error.message);

  // Only the name and message are logged: errors can carry request bodies or invoice data.
  console.error("Unexpected error", {
    name: error instanceof Error ? error.name : "unknown",
    message: error instanceof Error ? error.message : "",
  });
  return fail(500, "internal_error", "Something went wrong on our side. Try again in a moment.");
}

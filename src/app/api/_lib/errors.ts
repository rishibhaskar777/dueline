import { ConfigError } from "@/lib/env";
import { PayPalApiError, PayPalTimeoutError } from "@/lib/paypal/errors";
import { fail } from "@/app/api/_lib/respond";

export function failFromError(error: unknown): Response {
  if (error instanceof ConfigError) return fail(500, "config_error", error.message);
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

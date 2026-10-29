import { ConfigError } from "@/lib/env";
import { PayPalApiError, PayPalTimeoutError } from "@/lib/paypal/errors";
import { fail } from "@/app/api/_lib/respond";

export function failFromError(error: unknown): Response {
  if (error instanceof ConfigError) return fail(500, "config_error", error.message);
  if (error instanceof PayPalApiError) {
    return fail(502, "paypal_error", `PayPal returned an error: ${error.message}`, error.debugId);
  }
  if (error instanceof PayPalTimeoutError) return fail(502, "paypal_error", error.message);
  throw error;
}

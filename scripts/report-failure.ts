import { ExtractionFailedError } from "@/lib/ai/extract-invoice";
import { AiUnavailableError } from "@/lib/ai/model";
import { ConfigError } from "@/lib/env";
import { RatesUnavailableError } from "@/lib/rates/ecb";
import { PayPalApiError, PayPalTimeoutError } from "@/lib/paypal/errors";

export function reportFailure(error: unknown): never {
  if (error instanceof PayPalApiError) {
    console.error(`PayPal error ${error.paypalName}: ${error.message}`);
    console.error(`Debug id: ${error.debugId ?? "none"}`);
  } else if (
    error instanceof PayPalTimeoutError ||
    error instanceof ConfigError ||
    error instanceof AiUnavailableError ||
    error instanceof ExtractionFailedError ||
    error instanceof RatesUnavailableError
  ) {
    console.error(error.message);
  } else {
    console.error("Unexpected failure:", error instanceof Error ? error.message : "unknown error");
  }
  process.exit(1);
}

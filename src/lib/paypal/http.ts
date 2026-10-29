import { PayPalApiError, PayPalTimeoutError, type PayPalErrorDetail } from "./errors";

const PAYPAL_BASE_URL = "https://api-m.sandbox.paypal.com";
export const REQUEST_TIMEOUT_MS = 10_000;

interface PayPalErrorBody {
  name?: string;
  message?: string;
  debug_id?: string;
  details?: PayPalErrorDetail[];
}

async function toApiError(response: Response): Promise<PayPalApiError> {
  let body: PayPalErrorBody = {};
  try {
    body = (await response.json()) as PayPalErrorBody;
  } catch {
    // PayPal sometimes answers with an empty or non-JSON body; the status still says enough.
  }
  const debugId = body.debug_id ?? response.headers.get("paypal-debug-id") ?? undefined;
  console.error("PayPal error", { status: response.status, name: body.name, debugId });
  return new PayPalApiError({
    status: response.status,
    paypalName: body.name ?? "UNKNOWN_ERROR",
    message: body.message ?? `PayPal answered with status ${response.status}.`,
    debugId,
    details: body.details,
  });
}

function isAbort(error: unknown): boolean {
  return (
    error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

export async function fetchPayPal(path: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${PAYPAL_BASE_URL}${path}`, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (isAbort(error)) throw new PayPalTimeoutError();
    throw error;
  }
  if (!response.ok) throw await toApiError(response);
  return response;
}

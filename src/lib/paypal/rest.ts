import "server-only";
import { PayPalApiError } from "./errors";
import { fetchPayPal } from "./http";
import { clearAccessToken, getAccessToken } from "./token";

interface PayPalRequest {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  // Sent as is, for a body that embeds text which must reach PayPal byte for byte.
  rawBody?: string;
  headers?: Record<string, string>;
  requestId?: string;
}

async function send(path: string, request: PayPalRequest): Promise<Response> {
  const token = await getAccessToken();
  return fetchPayPal(path, {
    method: request.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(request.requestId ? { "PayPal-Request-Id": request.requestId } : {}),
      ...request.headers,
    },
    body:
      request.rawBody ?? (request.body === undefined ? undefined : JSON.stringify(request.body)),
  });
}

export async function paypalFetch<T>(path: string, request: PayPalRequest = {}): Promise<T> {
  let response: Response;
  try {
    response = await send(path, request);
  } catch (error) {
    if (!(error instanceof PayPalApiError) || error.status !== 401) throw error;
    clearAccessToken();
    response = await send(path, request);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
